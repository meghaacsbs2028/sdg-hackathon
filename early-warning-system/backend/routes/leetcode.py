"""LeetCode activity routes — link, sync, view, leaderboard."""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.db import get_db
from auth.dependencies import get_current_user
from models.user import User
from models.student_profile import StudentProfile
from models.academic_record import AcademicRecord
from models.leetcode_activity import LeetCodeProfile, ContestHistory
from services.leetcode_service import (
    fetch_user_stats, fetch_contest_history, calculate_activity_score,
)

router = APIRouter(prefix="/leetcode", tags=["LeetCode"])

# ── Schemas ────────────────────────────────────────────────────────────────

class LinkRequest(BaseModel):
    leetcode_username: str


def _profile_dict(p: LeetCodeProfile, include_contests: bool = False) -> dict:
    d = {
        "id": p.id,
        "student_id": p.student_id,
        "leetcode_username": p.leetcode_username,
        "easy_solved": p.easy_solved,
        "medium_solved": p.medium_solved,
        "hard_solved": p.hard_solved,
        "total_solved": p.total_solved,
        "contest_rating": p.contest_rating,
        "contests_attended": p.contests_attended,
        "global_ranking": p.global_ranking,
        "activity_score": p.activity_score,
        "last_synced_at": p.last_synced_at.isoformat() if p.last_synced_at else None,
    }
    if include_contests:
        contests = (
            p.contest_history
            .order_by(desc(ContestHistory.contest_timestamp))
            .all()
        )
        d["contests"] = [
            {
                "id": c.id,
                "contest_title": c.contest_title,
                "problems_solved": c.problems_solved,
                "total_problems": c.total_problems,
                "ranking": c.ranking,
                "rating_after": c.rating_after,
                "finish_time_seconds": c.finish_time_seconds,
                "contest_date": c.contest_timestamp.isoformat() if c.contest_timestamp else None,
            }
            for c in contests
        ]
    return d


async def _do_sync(profile: LeetCodeProfile, db: Session) -> dict:
    """Fetch data from LeetCode and update the profile + contests."""
    username = profile.leetcode_username

    # 1. Fetch problem stats
    stats = await fetch_user_stats(username)
    if stats is None:
        raise HTTPException(400, f"Could not fetch data for '{username}'. Check the username.")

    profile.easy_solved = stats["easy"]
    profile.medium_solved = stats["medium"]
    profile.hard_solved = stats["hard"]
    profile.total_solved = stats["total"]

    # 2. Fetch contest history
    contest_data = await fetch_contest_history(username)
    contests_list = []
    if contest_data:
        profile.contest_rating = contest_data["rating"]
        profile.global_ranking = contest_data["global_ranking"]
        profile.contests_attended = contest_data["attended"]
        contests_list = contest_data["contests"]

        # Upsert contest records
        for c in contests_list:
            existing = db.query(ContestHistory).filter(
                ContestHistory.profile_id == profile.id,
                ContestHistory.contest_title == c["title"],
            ).first()
            if existing:
                existing.problems_solved = c["problems_solved"]
                existing.total_problems = c["total_problems"]
                existing.ranking = c["ranking"]
                existing.rating_after = c["rating_after"]
                existing.finish_time_seconds = c["finish_time_seconds"]
                existing.contest_timestamp = c["contest_timestamp"]
            else:
                db.add(ContestHistory(
                    profile_id=profile.id,
                    contest_title=c["title"],
                    problems_solved=c["problems_solved"],
                    total_problems=c["total_problems"],
                    ranking=c["ranking"],
                    rating_after=c["rating_after"],
                    finish_time_seconds=c["finish_time_seconds"],
                    contest_timestamp=c["contest_timestamp"],
                ))

    # 3. Calculate score
    has_recent = profile.last_synced_at is None or True  # first sync or forced
    profile.activity_score = calculate_activity_score(
        easy=stats["easy"], medium=stats["medium"], hard=stats["hard"],
        contests_attended=profile.contests_attended,
        contests=contests_list,
        has_recent_activity=has_recent,
    )

    profile.last_synced_at = datetime.now(timezone.utc)
    db.commit()

    # 4. Update AcademicRecord.lms_activity
    record = (
        db.query(AcademicRecord)
        .filter(AcademicRecord.student_id == profile.student_id)
        .order_by(desc(AcademicRecord.created_at))
        .first()
    )
    if record:
        record.lms_activity = profile.activity_score
        db.commit()

        # 5. Re-run ML prediction
        try:
            from routes.predictions import predict_and_save
            predict_and_save(profile.student_id, db)
        except Exception:
            pass  # ML model might not be ready

    db.refresh(profile)
    return _profile_dict(profile, include_contests=True)


# ══════════════════════════════════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════════════════════════════════

@router.post("/link")
async def link_leetcode(
    body: LinkRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Student links their LeetCode username."""
    if user.role != "student":
        raise HTTPException(403, "Only students can link a LeetCode account")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(404, "Student profile not found")

    # Check if already linked
    existing = db.query(LeetCodeProfile).filter(
        LeetCodeProfile.student_id == profile.id
    ).first()

    if existing:
        # Update username
        existing.leetcode_username = body.leetcode_username.strip()
        db.commit()
        result = await _do_sync(existing, db)
        return {"message": "Username updated & synced!", "profile": result}

    # Create new
    lc_profile = LeetCodeProfile(
        student_id=profile.id,
        leetcode_username=body.leetcode_username.strip(),
    )
    db.add(lc_profile)
    db.commit()
    db.refresh(lc_profile)

    result = await _do_sync(lc_profile, db)
    return {"message": "LeetCode linked & synced!", "profile": result}


@router.post("/sync/{student_id}")
async def sync_student(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Trigger a re-sync for a student's LeetCode data."""
    lc = db.query(LeetCodeProfile).filter(
        LeetCodeProfile.student_id == student_id
    ).first()
    if not lc:
        raise HTTPException(404, "Student has not linked a LeetCode account")

    # Students can only sync themselves
    if user.role == "student":
        sp = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if not sp or sp.id != student_id:
            raise HTTPException(403, "Cannot sync another student's data")

    result = await _do_sync(lc, db)
    return {"message": "Synced successfully!", "profile": result}


@router.get("/my")
async def my_leetcode(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Student views their own LeetCode stats."""
    if user.role != "student":
        raise HTTPException(403, "Use /leetcode/student/{id} instead")

    sp = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not sp:
        raise HTTPException(404, "Student profile not found")

    lc = db.query(LeetCodeProfile).filter(LeetCodeProfile.student_id == sp.id).first()
    if not lc:
        return {"linked": False, "profile": None}

    return {"linked": True, "profile": _profile_dict(lc, include_contests=True)}


@router.get("/student/{student_id}")
def student_leetcode(
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Faculty/HOD/Admin views a student's LeetCode stats."""
    if user.role == "student":
        raise HTTPException(403, "Forbidden")

    lc = db.query(LeetCodeProfile).filter(
        LeetCodeProfile.student_id == student_id
    ).first()
    if not lc:
        return {"linked": False, "profile": None}

    return {"linked": True, "profile": _profile_dict(lc, include_contests=True)}


@router.get("/class-stats")
def class_leaderboard(
    year: int = Query(None),
    section: str = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Leaderboard of students sorted by LeetCode activity score."""
    if user.role == "student":
        raise HTTPException(403, "Forbidden")

    query = (
        db.query(LeetCodeProfile, StudentProfile)
        .join(StudentProfile, LeetCodeProfile.student_id == StudentProfile.id)
    )
    if year:
        query = query.filter(StudentProfile.year == year)
    if section:
        query = query.filter(StudentProfile.section == section)

    results = query.order_by(desc(LeetCodeProfile.activity_score)).all()

    # Also get user names
    from models.user import User as UserModel
    leaderboard = []
    for lc, sp in results:
        u = db.query(UserModel).filter(UserModel.id == sp.user_id).first()
        leaderboard.append({
            "student_id": sp.id,
            "name": u.name if u else "Unknown",
            "roll_number": sp.roll_number,
            "year": sp.year,
            "section": sp.section,
            "leetcode_username": lc.leetcode_username,
            "total_solved": lc.total_solved,
            "easy_solved": lc.easy_solved,
            "medium_solved": lc.medium_solved,
            "hard_solved": lc.hard_solved,
            "contest_rating": lc.contest_rating,
            "contests_attended": lc.contests_attended,
            "activity_score": lc.activity_score,
            "last_synced_at": lc.last_synced_at.isoformat() if lc.last_synced_at else None,
        })

    return {"leaderboard": leaderboard, "count": len(leaderboard)}


@router.post("/sync-all")
async def sync_all(
    year: int = Query(None),
    section: str = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Bulk sync all linked students (faculty/HOD/admin)."""
    if user.role == "student":
        raise HTTPException(403, "Forbidden")

    query = (
        db.query(LeetCodeProfile)
        .join(StudentProfile, LeetCodeProfile.student_id == StudentProfile.id)
    )
    if year:
        query = query.filter(StudentProfile.year == year)
    if section:
        query = query.filter(StudentProfile.section == section)

    profiles = query.all()
    synced = 0
    failed = 0

    for profile in profiles:
        try:
            await _do_sync(profile, db)
            synced += 1
        except Exception:
            failed += 1

    return {
        "message": f"Synced {synced} students, {failed} failed",
        "synced": synced,
        "failed": failed,
        "total": len(profiles),
    }


@router.get("/contest-defaulters")
def contest_defaulters(
    last_n: int = Query(3, description="Check last N contests"),
    year: int = Query(None),
    section: str = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Find students who didn't attend recent weekly/biweekly contests."""
    if user.role == "student":
        raise HTTPException(403, "Forbidden")

    from models.user import User as UserModel

    # 1. Find the most recent N distinct contest titles across all students
    recent_contests = (
        db.query(ContestHistory.contest_title)
        .distinct()
        .order_by(desc(ContestHistory.contest_timestamp))
        .limit(last_n * 2)  # fetch extra to filter types
        .all()
    )
    contest_titles = [r[0] for r in recent_contests if r[0]]

    # Filter to weekly/biweekly only
    target_contests = [
        t for t in contest_titles
        if "weekly" in t.lower() or "biweekly" in t.lower()
    ][:last_n]

    if not target_contests:
        return {"defaulters": [], "contests_checked": [], "total_linked": 0}

    # 2. Get all linked students (with optional filters)
    query = (
        db.query(LeetCodeProfile, StudentProfile)
        .join(StudentProfile, LeetCodeProfile.student_id == StudentProfile.id)
    )
    if year:
        query = query.filter(StudentProfile.year == year)
    if section:
        query = query.filter(StudentProfile.section == section)
    if user.role in ("faculty", "hod"):
        query = query.filter(StudentProfile.department_id == user.department_id)

    all_linked = query.all()

    # 3. For each student, check which of the target contests they missed
    defaulters = []
    for lc, sp in all_linked:
        attended_titles = set(
            c.contest_title for c in
            db.query(ContestHistory.contest_title)
            .filter(ContestHistory.profile_id == lc.id)
            .all()
        )
        missed = [t for t in target_contests if t not in attended_titles]
        if missed:
            u = db.query(UserModel).filter(UserModel.id == sp.user_id).first()
            defaulters.append({
                "student_id": sp.id,
                "name": u.name if u else "Unknown",
                "roll_number": sp.roll_number,
                "year": sp.year,
                "section": sp.section,
                "leetcode_username": lc.leetcode_username,
                "contests_attended": lc.contests_attended,
                "missed_contests": missed,
                "missed_count": len(missed),
            })

    # Sort by most missed first
    defaulters.sort(key=lambda d: d["missed_count"], reverse=True)

    # 4. Also get students who haven't linked LeetCode at all
    linked_ids = {sp.id for _, sp in all_linked}
    sp_query = db.query(StudentProfile)
    if year:
        sp_query = sp_query.filter(StudentProfile.year == year)
    if section:
        sp_query = sp_query.filter(StudentProfile.section == section)
    if user.role in ("faculty", "hod"):
        sp_query = sp_query.filter(StudentProfile.department_id == user.department_id)

    all_students = sp_query.all()
    not_linked = []
    for sp in all_students:
        if sp.id not in linked_ids:
            u = db.query(UserModel).filter(UserModel.id == sp.user_id).first()
            not_linked.append({
                "student_id": sp.id,
                "name": u.name if u else "Unknown",
                "roll_number": sp.roll_number,
                "year": sp.year,
                "section": sp.section,
                "leetcode_username": None,
                "contests_attended": 0,
                "missed_contests": target_contests,
                "missed_count": len(target_contests),
            })

    return {
        "defaulters": defaulters,
        "not_linked": not_linked,
        "contests_checked": target_contests,
        "total_linked": len(all_linked),
        "total_students": len(all_students),
    }
