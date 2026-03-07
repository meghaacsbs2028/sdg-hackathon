"""LeetCode GraphQL service — auto-fetch user stats + contest history."""

import httpx
from datetime import datetime, timezone
from typing import Optional

LEETCODE_GRAPHQL = "https://leetcode.com/graphql"

# ── GraphQL Queries ────────────────────────────────────────────────────────

_USER_STATS_QUERY = """
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
    }
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
}
"""

_CONTEST_RANKING_QUERY = """
query userContestRankingInfo($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
  }
  userContestRankingHistory(username: $username) {
    attended
    rating
    ranking
    contest {
      title
      startTime
    }
    problemsSolved
    totalProblems
    finishTimeInSeconds
  }
}
"""


async def _graphql(query: str, variables: dict) -> Optional[dict]:
    """Send a GraphQL request to LeetCode."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                LEETCODE_GRAPHQL,
                json={"query": query, "variables": variables},
                headers={
                    "Content-Type": "application/json",
                    "Referer": "https://leetcode.com",
                },
            )
            if resp.status_code == 200:
                return resp.json().get("data")
            return None
    except Exception:
        return None


async def fetch_user_stats(username: str) -> Optional[dict]:
    """Fetch problems solved breakdown for a LeetCode user.

    Returns: {easy, medium, hard, total, ranking} or None.
    """
    data = await _graphql(_USER_STATS_QUERY, {"username": username})
    if not data or not data.get("matchedUser"):
        return None

    user = data["matchedUser"]
    stats = {"easy": 0, "medium": 0, "hard": 0, "total": 0, "ranking": 0}

    profile = user.get("profile") or {}
    stats["ranking"] = profile.get("ranking") or 0

    for entry in (user.get("submitStatsGlobal") or {}).get("acSubmissionNum") or []:
        diff = entry.get("difficulty", "").lower()
        count = entry.get("count", 0)
        if diff == "easy":
            stats["easy"] = count
        elif diff == "medium":
            stats["medium"] = count
        elif diff == "hard":
            stats["hard"] = count
        elif diff == "all":
            stats["total"] = count

    if stats["total"] == 0:
        stats["total"] = stats["easy"] + stats["medium"] + stats["hard"]

    return stats


async def fetch_contest_history(username: str) -> Optional[dict]:
    """Fetch contest ranking + history for a LeetCode user.

    Returns: {rating, global_ranking, attended, contests: [...]} or None.
    """
    data = await _graphql(_CONTEST_RANKING_QUERY, {"username": username})
    if not data:
        return None

    ranking = data.get("userContestRanking") or {}
    history_raw = data.get("userContestRankingHistory") or []

    # Only include contests the user actually attended
    contests = []
    for entry in history_raw:
        if not entry.get("attended"):
            continue
        contest_info = entry.get("contest") or {}
        start_ts = contest_info.get("startTime")
        contest_dt = None
        if start_ts:
            try:
                contest_dt = datetime.fromtimestamp(int(start_ts), tz=timezone.utc)
            except (ValueError, TypeError):
                pass

        contests.append({
            "title": contest_info.get("title", "Unknown"),
            "problems_solved": entry.get("problemsSolved", 0),
            "total_problems": entry.get("totalProblems", 4),
            "ranking": entry.get("ranking", 0),
            "rating_after": entry.get("rating", 0),
            "finish_time_seconds": entry.get("finishTimeInSeconds", 0),
            "contest_timestamp": contest_dt,
        })

    return {
        "rating": ranking.get("rating") or 0,
        "global_ranking": ranking.get("globalRanking") or 0,
        "attended": ranking.get("attendedContestsCount") or 0,
        "contests": contests,
    }


def calculate_activity_score(
    easy: int, medium: int, hard: int,
    contests_attended: int,
    contests: list,
    has_recent_activity: bool = True,
) -> float:
    """Calculate a 0–100 activity score from LeetCode data.

    Scoring breakdown:
      - Problems Solved  (40 pts): easy×1 + medium×3 + hard×5, capped at 40
      - Contest Participation (30 pts): 3 pts per contest, capped at 30
      - Contest Performance (20 pts): avg problems solved per contest × 5, capped at 20
      - Consistency (10 pts): has activity = 10, else 0
    """
    # 1. Problem score (max 40)
    raw_problem = easy * 1 + medium * 3 + hard * 5
    problem_score = min(40.0, raw_problem)

    # 2. Contest participation (max 30)
    contest_part_score = min(30.0, contests_attended * 3)

    # 3. Contest performance (max 20)
    contest_perf_score = 0.0
    if contests and len(contests) > 0:
        avg_solved = sum(c.get("problems_solved", 0) for c in contests) / len(contests)
        contest_perf_score = min(20.0, avg_solved * 5)

    # 4. Consistency (max 10)
    consistency_score = 10.0 if has_recent_activity else 0.0

    total = problem_score + contest_part_score + contest_perf_score + consistency_score
    return round(min(100.0, total), 1)
