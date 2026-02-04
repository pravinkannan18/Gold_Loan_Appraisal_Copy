"""
Query Profiling Middleware
Tracks database query performance and identifies slow queries
"""
import time
import logging
import functools
from typing import Callable, Any, Dict, List
from contextlib import contextmanager
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)

# Thread-local storage for query tracking
_query_stats = threading.local()


class QueryProfiler:
    """
    Profiles database queries and tracks performance metrics.
    
    Usage:
        profiler = QueryProfiler()
        
        with profiler.track_query("SELECT * FROM users WHERE id = %s", (1,)):
            cursor.execute(query, params)
        
        # Get stats
        stats = profiler.get_stats()
    """
    
    def __init__(self, slow_query_threshold_ms: float = 100.0):
        self.slow_query_threshold_ms = slow_query_threshold_ms
        self._lock = threading.Lock()
        self._stats: Dict[str, Dict] = defaultdict(lambda: {
            'count': 0,
            'total_time_ms': 0.0,
            'max_time_ms': 0.0,
            'min_time_ms': float('inf'),
            'slow_count': 0
        })
    
    @contextmanager
    def track_query(self, query: str, params: tuple = None):
        """Context manager to track query execution time"""
        # Normalize query for grouping (remove specific values)
        normalized = self._normalize_query(query)
        
        start_time = time.perf_counter()
        try:
            yield
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            with self._lock:
                stats = self._stats[normalized]
                stats['count'] += 1
                stats['total_time_ms'] += duration_ms
                stats['max_time_ms'] = max(stats['max_time_ms'], duration_ms)
                stats['min_time_ms'] = min(stats['min_time_ms'], duration_ms)
                
                if duration_ms > self.slow_query_threshold_ms:
                    stats['slow_count'] += 1
                    # Log slow queries with truncated query text
                    truncated_query = query[:200] + '...' if len(query) > 200 else query
                    logger.warning(
                        f"🐢 SLOW QUERY ({duration_ms:.2f}ms): {truncated_query}"
                    )
    
    def _normalize_query(self, query: str) -> str:
        """Normalize query by removing specific parameter values"""
        import re
        # Replace numeric values
        normalized = re.sub(r'\b\d+\b', '?', query)
        # Replace quoted strings
        normalized = re.sub(r"'[^']*'", "'?'", normalized)
        # Replace UUIDs
        normalized = re.sub(
            r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}',
            '?uuid?', 
            normalized, 
            flags=re.IGNORECASE
        )
        # Collapse whitespace
        normalized = ' '.join(normalized.split())
        return normalized[:500]  # Limit length
    
    def get_stats(self) -> List[Dict]:
        """Get query statistics sorted by total time"""
        with self._lock:
            results = []
            for query, stats in self._stats.items():
                avg_time = stats['total_time_ms'] / stats['count'] if stats['count'] > 0 else 0
                results.append({
                    'query': query[:100] + '...' if len(query) > 100 else query,
                    'count': stats['count'],
                    'total_time_ms': round(stats['total_time_ms'], 2),
                    'avg_time_ms': round(avg_time, 2),
                    'max_time_ms': round(stats['max_time_ms'], 2),
                    'min_time_ms': round(stats['min_time_ms'], 2) if stats['min_time_ms'] != float('inf') else 0,
                    'slow_count': stats['slow_count']
                })
            
            # Sort by total time descending
            results.sort(key=lambda x: x['total_time_ms'], reverse=True)
            return results
    
    def reset_stats(self):
        """Reset all statistics"""
        with self._lock:
            self._stats.clear()


# Global profiler instance
_profiler = QueryProfiler()


def get_profiler() -> QueryProfiler:
    """Get the global query profiler instance"""
    return _profiler


def profile_db_method(method: Callable) -> Callable:
    """
    Decorator to profile database methods.
    
    Usage:
        @profile_db_method
        def get_session(self, session_id):
            ...
    """
    @functools.wraps(method)
    def wrapper(*args, **kwargs):
        method_name = f"{method.__module__}.{method.__qualname__}"
        start_time = time.perf_counter()
        
        try:
            result = method(*args, **kwargs)
            return result
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            if duration_ms > 500:  # Log methods taking > 500ms
                logger.warning(
                    f"🐢 SLOW DB METHOD ({duration_ms:.2f}ms): {method_name}"
                )
            elif duration_ms > 100:
                logger.debug(
                    f"⚠️ DB METHOD ({duration_ms:.2f}ms): {method_name}"
                )
    
    return wrapper


class RequestQueryTracker:
    """
    Track queries within a single request context.
    
    Usage:
        tracker = RequestQueryTracker()
        tracker.start()
        
        # ... execute queries ...
        tracker.log_query("SELECT ...", 10.5)
        
        summary = tracker.get_summary()
    """
    
    def __init__(self):
        self.queries: List[Dict] = []
        self.start_time: float = 0
        self.request_id: str = ""
    
    def start(self, request_id: str = ""):
        """Start tracking for a new request"""
        self.queries = []
        self.start_time = time.perf_counter()
        self.request_id = request_id
    
    def log_query(self, query: str, duration_ms: float):
        """Log a query execution"""
        self.queries.append({
            'query': query[:200],
            'duration_ms': duration_ms,
            'timestamp': time.perf_counter() - self.start_time
        })
    
    def get_summary(self) -> Dict:
        """Get summary of queries for this request"""
        total_query_time = sum(q['duration_ms'] for q in self.queries)
        return {
            'request_id': self.request_id,
            'query_count': len(self.queries),
            'total_query_time_ms': round(total_query_time, 2),
            'queries': self.queries
        }


def init_request_tracker() -> RequestQueryTracker:
    """Initialize a request-scoped query tracker"""
    if not hasattr(_query_stats, 'tracker'):
        _query_stats.tracker = RequestQueryTracker()
    return _query_stats.tracker


def get_request_tracker() -> RequestQueryTracker:
    """Get the current request's query tracker"""
    return getattr(_query_stats, 'tracker', None)
