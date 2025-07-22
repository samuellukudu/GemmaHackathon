import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { offlineManager } from '@/lib/offline-manager';
import { useLessonProgress } from '@/hooks/use-lesson-progress';

export default function LocalStorageDebugger() {
  const [localStorageStatus, setLocalStorageStatus] = useState<string>('Testing...');
  const [testResults, setTestResults] = useState<string[]>([]);
  const { lessonProgressList, refreshProgress } = useLessonProgress();

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const results: string[] = [];

    // Test 1: Basic localStorage functionality
    try {
      const testKey = 'debug_test_' + Date.now();
      const testValue = { test: 'value', timestamp: Date.now() };
      
      localStorage.setItem(testKey, JSON.stringify(testValue));
      const retrieved = localStorage.getItem(testKey);
      
      if (retrieved && JSON.parse(retrieved).test === 'value') {
        results.push('✅ Basic localStorage: Working');
        setLocalStorageStatus('✅ Working');
      } else {
        results.push('❌ Basic localStorage: Failed to retrieve');
        setLocalStorageStatus('❌ Failed');
      }
      
      localStorage.removeItem(testKey);
    } catch (error) {
      results.push(`❌ Basic localStorage: Error - ${error}`);
      setLocalStorageStatus('❌ Error');
    }

    // Test 2: Check existing localStorage keys
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      results.push(`📊 Total localStorage keys: ${keys.length}`);
      results.push(`🔑 Keys: ${keys.join(', ')}`);
    } catch (error) {
      results.push(`❌ Failed to enumerate keys: ${error}`);
    }

    // Test 3: Test offlineManager
    try {
      const testTopic = 'Test Topic - ' + Date.now();
      await offlineManager.saveTopicProgress(testTopic, 'test');
      results.push(`✅ OfflineManager saveTopicProgress: Working`);
      
      // Test lesson progress
      const testQueryId = 'test_query_' + Date.now();
      await offlineManager.saveLessonProgress(testQueryId, 0, false);
      await offlineManager.saveTopicInfo(testQueryId, 'How does test work?', 3, true);
      
      const progress = await offlineManager.getLessonProgress(testQueryId);
      if (progress && Object.keys(progress).length > 0) {
        results.push(`✅ Lesson progress save/retrieve: Working`);
      } else {
        results.push(`❌ Lesson progress save/retrieve: No data found`);
      }
      
    } catch (error) {
      results.push(`❌ OfflineManager test: ${error}`);
    }

    // Test 4: Check specific localStorage keys for lesson progress
    try {
      const topicInfoKeys = [];
      const lessonProgressKeys = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('topic_info_')) {
          topicInfoKeys.push(key);
        } else if (key?.startsWith('lesson_progress_')) {
          lessonProgressKeys.push(key);
        }
      }
      
      results.push(`📝 Topic info keys: ${topicInfoKeys.length} (${topicInfoKeys.join(', ')})`);
      results.push(`📚 Lesson progress keys: ${lessonProgressKeys.length} (${lessonProgressKeys.join(', ')})`);
      
      // Show details of first topic if available
      if (topicInfoKeys.length > 0) {
        const topicData = localStorage.getItem(topicInfoKeys[0]);
        if (topicData) {
          const parsed = JSON.parse(topicData);
          results.push(`📄 Sample topic: ${parsed.topic} (${parsed.totalLessons} lessons)`);
        }
      }
    } catch (error) {
      results.push(`❌ Failed to check lesson keys: ${error}`);
    }

    // Test 5: Refresh lesson progress list
    try {
      await refreshProgress();
      results.push(`✅ RefreshProgress: Called successfully`);
      results.push(`📋 Lesson progress list length: ${lessonProgressList.length}`);
      
      // Show details of lessons found
      lessonProgressList.forEach((lesson, idx) => {
        results.push(`  ${idx + 1}. "${lesson.topic}" - ${lesson.completedLessons}/${lesson.totalLessons} lessons (${Math.round(lesson.progress)}%)`);
      });
    } catch (error) {
      results.push(`❌ RefreshProgress: ${error}`);
    }

    setTestResults(results);
  };

  const clearAllData = async () => {
    try {
      await offlineManager.clearAllData();
      setTestResults(prev => [...prev, '🧹 All data cleared']);
      await refreshProgress();
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Clear failed: ${error}`]);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader>
        <CardTitle>localStorage & Lesson Progress Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <strong>localStorage Status:</strong> {localStorageStatus}
          </div>
          
          <div>
            <strong>Lesson Progress List:</strong> {lessonProgressList.length} items
            <ul className="ml-4 mt-2">
              {lessonProgressList.map((lesson, idx) => (
                <li key={idx} className="text-sm">
                  • {lesson.topic} - {lesson.completedLessons}/{lesson.totalLessons} ({Math.round(lesson.progress)}%)
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <strong>Test Results:</strong>
            <div className="bg-gray-100 p-3 rounded mt-2 font-mono text-sm max-h-64 overflow-y-auto">
              {testResults.map((result, idx) => (
                <div key={idx}>{result}</div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runTests} variant="outline">
              Rerun Tests
            </Button>
            <Button onClick={clearAllData} variant="outline">
              Clear All Data
            </Button>
            <Button onClick={refreshProgress} variant="outline">
              Refresh Progress
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 