import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function StorageDebug() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testStorageAccess = async () => {
    try {
      setLoading(true);
      setTestResult('Testing storage access...');

      // Test 1: Check bucket access
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        setTestResult(`Buckets error: ${bucketsError.message}`);
        return;
      }
      
      const listingsBucket = buckets?.find(b => b.id === 'listings-images');
      if (!listingsBucket) {
        setTestResult('Bucket not found');
        return;
      }

      setTestResult(prev => prev + '\n✓ Bucket found, public: ' + listingsBucket.public);

      // Test 2: List files in bucket
      const { data: files, error: filesError } = await supabase.storage
        .from('listings-images')
        .list('', { limit: 5 });

      if (filesError) {
        setTestResult(prev => prev + `\n✗ List files error: ${filesError.message}`);
      } else {
        setTestResult(prev => prev + `\n✓ Files in bucket: ${files.length}`);
        if (files.length > 0) {
          const firstFile = files[0];
          const { data: publicUrl } = supabase.storage
            .from('listings-images')
            .getPublicUrl(firstFile.name);
          setTestResult(prev => prev + `\n✓ Sample URL: ${publicUrl.publicUrl}`);
          
          // Test if URL is accessible
          try {
            const response = await fetch(publicUrl.publicUrl, { method: 'HEAD' });
            setTestResult(prev => prev + `\n✓ URL accessible (${response.status})`);
          } catch (e) {
            setTestResult(prev => prev + `\n✗ URL not accessible`);
          }
        }
      }

      setTestResult(prev => prev + '\n\n✓ Storage test completed');
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg p-4 max-w-sm z-50">
      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40 whitespace-pre-wrap">
        {testResult}
      </pre>
    </div>
  );
}
