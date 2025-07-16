#!/usr/bin/env python3
"""
Performance monitoring dashboard for the Gemma Hackathon API.
This script continuously monitors the application and alerts on performance issues.
"""

import asyncio
import httpx
import time
import json
from datetime import datetime
from typing import Dict, Any, List
import argparse

class PerformanceMonitor:
    """Performance monitoring dashboard"""
    
    def __init__(self, api_url: str = "http://localhost:8000", check_interval: int = 30):
        self.api_url = api_url.rstrip('/')
        self.check_interval = check_interval
        self.alerts_history: List[Dict[str, Any]] = []
        self.metrics_history: List[Dict[str, Any]] = []
        self.running = False
        
    async def fetch_metrics(self) -> Dict[str, Any]:
        """Fetch performance metrics from the API"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.api_url}/api/performance/metrics")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": time.time()
            }
    
    async def check_health(self) -> Dict[str, Any]:
        """Check API health"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                start_time = time.time()
                response = await client.get(f"{self.api_url}/api/health")
                response_time = time.time() - start_time
                response.raise_for_status()
                
                health_data = response.json()
                health_data['response_time'] = response_time
                return health_data
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": time.time()
            }
    
    def analyze_metrics(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze metrics and generate alerts"""
        alerts = []
        timestamp = datetime.now().isoformat()
        
        if metrics.get("status") == "error":
            alerts.append({
                "level": "critical",
                "message": f"Failed to fetch metrics: {metrics.get('error')}",
                "timestamp": timestamp
            })
            return alerts
        
        # Analyze queue stats
        queue_stats = metrics.get("metrics", {}).get("queue_stats", {})
        if queue_stats:
            queue_size = queue_stats.get("queue_size", 0)
            active_tasks = queue_stats.get("active_tasks", 0)
            workers = queue_stats.get("workers", 1)
            
            # Alert on large queue backlog
            if queue_size > 20:
                alerts.append({
                    "level": "critical",
                    "message": f"Large queue backlog: {queue_size} tasks pending",
                    "timestamp": timestamp
                })
            elif queue_size > 10:
                alerts.append({
                    "level": "warning",
                    "message": f"Queue backlog building up: {queue_size} tasks pending",
                    "timestamp": timestamp
                })
            
            # Alert on high task load
            if active_tasks > workers * 3:
                alerts.append({
                    "level": "warning",
                    "message": f"High task load: {active_tasks} active tasks for {workers} workers",
                    "timestamp": timestamp
                })
        
        # Analyze profiling report
        profiling_report = metrics.get("metrics", {}).get("profiling_report", {})
        if profiling_report:
            # Check for blocking functions
            blocking_functions = profiling_report.get("blocking_functions", [])
            for func in blocking_functions[:3]:  # Top 3 blocking functions
                if func.get("blocking_ratio", 0) > 0.5:  # More than 50% blocking calls
                    alerts.append({
                        "level": "critical",
                        "message": f"Blocking function detected: {func['name']} ({func['blocking_ratio']*100:.1f}% blocking)",
                        "timestamp": timestamp
                    })
                elif func.get("blocking_ratio", 0) > 0.2:  # More than 20% blocking calls
                    alerts.append({
                        "level": "warning",
                        "message": f"Function may be blocking: {func['name']} ({func['blocking_ratio']*100:.1f}% blocking)",
                        "timestamp": timestamp
                    })
            
            # Check for slow functions
            slow_functions = profiling_report.get("slow_functions", [])
            for func in slow_functions[:3]:  # Top 3 slow functions
                avg_time = func.get("avg_time", 0)
                if avg_time > 5.0:  # More than 5 seconds average
                    alerts.append({
                        "level": "critical",
                        "message": f"Very slow function: {func['name']} (avg: {avg_time:.2f}s)",
                        "timestamp": timestamp
                    })
                elif avg_time > 2.0:  # More than 2 seconds average
                    alerts.append({
                        "level": "warning",
                        "message": f"Slow function: {func['name']} (avg: {avg_time:.2f}s)",
                        "timestamp": timestamp
                    })
            
            # Check for error-prone functions
            error_prone_functions = profiling_report.get("error_prone_functions", [])
            for func in error_prone_functions[:3]:  # Top 3 error-prone functions
                error_ratio = func.get("error_ratio", 0)
                if error_ratio > 0.1:  # More than 10% error rate
                    alerts.append({
                        "level": "critical",
                        "message": f"High error rate: {func['name']} ({error_ratio*100:.1f}% errors)",
                        "timestamp": timestamp
                    })
                elif error_ratio > 0.05:  # More than 5% error rate
                    alerts.append({
                        "level": "warning",
                        "message": f"Elevated error rate: {func['name']} ({error_ratio*100:.1f}% errors)",
                        "timestamp": timestamp
                    })
            
            # Check system resources
            system_info = profiling_report.get("system_info", {})
            if system_info:
                cpu_percent = system_info.get("cpu_percent", 0)
                memory_percent = system_info.get("memory_percent", 0)
                
                if cpu_percent > 90:
                    alerts.append({
                        "level": "critical",
                        "message": f"High CPU usage: {cpu_percent:.1f}%",
                        "timestamp": timestamp
                    })
                elif cpu_percent > 70:
                    alerts.append({
                        "level": "warning",
                        "message": f"Elevated CPU usage: {cpu_percent:.1f}%",
                        "timestamp": timestamp
                    })
                
                if memory_percent > 90:
                    alerts.append({
                        "level": "critical",
                        "message": f"High memory usage: {memory_percent:.1f}%",
                        "timestamp": timestamp
                    })
                elif memory_percent > 70:
                    alerts.append({
                        "level": "warning",
                        "message": f"Elevated memory usage: {memory_percent:.1f}%",
                        "timestamp": timestamp
                    })
        
        return alerts
    
    def print_dashboard(self, health: Dict[str, Any], metrics: Dict[str, Any], alerts: List[Dict[str, Any]]):
        """Print the monitoring dashboard"""
        print("\n" + "="*80)
        print(f"PERFORMANCE MONITORING DASHBOARD - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        # Health status
        print(f"\n🏥 HEALTH STATUS")
        health_status = health.get("status", "unknown")
        response_time = health.get("response_time", 0)
        if health_status == "healthy":
            print(f"   ✅ API is healthy (response time: {response_time*1000:.1f}ms)")
        else:
            print(f"   ❌ API is unhealthy: {health.get('error', 'Unknown error')}")
        
        # Queue statistics
        queue_stats = metrics.get("metrics", {}).get("queue_stats", {})
        if queue_stats:
            print(f"\n📊 TASK QUEUE STATUS")
            print(f"   Queue Size: {queue_stats.get('queue_size', 0)}")
            print(f"   Active Tasks: {queue_stats.get('active_tasks', 0)}")
            print(f"   Workers: {queue_stats.get('workers', 0)}")
            print(f"   Running: {queue_stats.get('running', False)}")
        
        # System resources
        profiling_report = metrics.get("metrics", {}).get("profiling_report", {})
        system_info = profiling_report.get("system_info", {})
        if system_info:
            print(f"\n💻 SYSTEM RESOURCES")
            print(f"   CPU Usage: {system_info.get('cpu_percent', 0):.1f}%")
            print(f"   Memory Usage: {system_info.get('memory_percent', 0):.1f}%")
            print(f"   Threads: {system_info.get('num_threads', 0)}")
        
        # Performance issues
        if profiling_report:
            blocking_functions = profiling_report.get("blocking_functions", [])
            slow_functions = profiling_report.get("slow_functions", [])
            error_prone_functions = profiling_report.get("error_prone_functions", [])
            
            if blocking_functions:
                print(f"\n⚠️  BLOCKING FUNCTIONS (Top 3)")
                for func in blocking_functions[:3]:
                    print(f"   🔴 {func['name']}: {func['blocking_ratio']*100:.1f}% blocking calls")
            
            if slow_functions:
                print(f"\n🐌 SLOW FUNCTIONS (Top 3)")
                for func in slow_functions[:3]:
                    print(f"   🟡 {func['name']}: avg {func['avg_time']:.2f}s, max {func['max_time']:.2f}s")
            
            if error_prone_functions:
                print(f"\n💥 ERROR-PRONE FUNCTIONS (Top 3)")
                for func in error_prone_functions[:3]:
                    print(f"   🔴 {func['name']}: {func['error_ratio']*100:.1f}% error rate")
        
        # Alerts
        if alerts:
            print(f"\n🚨 ACTIVE ALERTS ({len(alerts)})")
            for alert in alerts:
                level_emoji = "🔴" if alert["level"] == "critical" else "🟡"
                print(f"   {level_emoji} [{alert['level'].upper()}] {alert['message']}")
        else:
            print(f"\n✅ NO ACTIVE ALERTS")
        
        print("\n" + "="*80)
    
    async def run_monitoring(self):
        """Run continuous monitoring"""
        self.running = True
        print(f"Starting performance monitoring (checking every {self.check_interval}s)")
        print(f"Monitoring API at: {self.api_url}")
        print("Press Ctrl+C to stop")
        
        try:
            while self.running:
                # Fetch health and metrics
                health_task = asyncio.create_task(self.check_health())
                metrics_task = asyncio.create_task(self.fetch_metrics())
                
                health, metrics = await asyncio.gather(health_task, metrics_task)
                
                # Analyze and generate alerts
                alerts = self.analyze_metrics(metrics)
                
                # Store history
                self.metrics_history.append({
                    "timestamp": time.time(),
                    "health": health,
                    "metrics": metrics,
                    "alerts": alerts
                })
                self.alerts_history.extend(alerts)
                
                # Keep only recent history (last 100 entries)
                if len(self.metrics_history) > 100:
                    self.metrics_history = self.metrics_history[-100:]
                if len(self.alerts_history) > 200:
                    self.alerts_history = self.alerts_history[-200:]
                
                # Display dashboard
                self.print_dashboard(health, metrics, alerts)
                
                # Wait for next check
                await asyncio.sleep(self.check_interval)
                
        except KeyboardInterrupt:
            print("\n\nMonitoring stopped by user")
        except Exception as e:
            print(f"\n\nMonitoring error: {e}")
        finally:
            self.running = False
    
    def save_report(self, filename: str = None):
        """Save monitoring report to file"""
        if not filename:
            filename = f"performance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "monitoring_duration": len(self.metrics_history) * self.check_interval,
            "total_alerts": len(self.alerts_history),
            "metrics_history": self.metrics_history,
            "alerts_history": self.alerts_history
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\nReport saved to: {filename}")

async def main():
    parser = argparse.ArgumentParser(description="Performance monitoring dashboard")
    parser.add_argument("--url", default="http://localhost:8000", help="API URL to monitor")
    parser.add_argument("--interval", type=int, default=30, help="Check interval in seconds")
    parser.add_argument("--save-report", help="Save report to file on exit")
    
    args = parser.parse_args()
    
    monitor = PerformanceMonitor(api_url=args.url, check_interval=args.interval)
    
    try:
        await monitor.run_monitoring()
    finally:
        if args.save_report:
            monitor.save_report(args.save_report)

if __name__ == "__main__":
    asyncio.run(main())