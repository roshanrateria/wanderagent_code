import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  photos: string[];
}

export default function TripJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ title: '', content: '' });
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('wanderagent-journal');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('wanderagent-journal', JSON.stringify(entries));
  }, [entries]);

  const addEntry = () => {
    if (!newEntry.title || !newEntry.content) return;
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      title: newEntry.title,
      content: newEntry.content,
      photos: []
    };
    setEntries(prev => [entry, ...prev]);
    setNewEntry({ title: '', content: '' });
  };

  const generateSummary = async () => {
    if (entries.length === 0) return;
    setIsGeneratingSummary(true);
    try {
      const allContent = entries.map(e => `${e.title}: ${e.content}`).join('\n');
      const prompt = `Summarize this trip journal in a engaging way: ${allContent}`;
      const response = await apiRequest('POST', '/api/gemini', { prompt });
      const data = await response.json();
      setSummary(data.caption);
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary('Unable to generate summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <i className="fas fa-book text-blue-500 mr-2"></i>
          <span className="font-medium">Trip Journal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trip Journal with AI Summaries</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Journal Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Entry Title"
                value={newEntry.title}
                onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Write about your day..."
                value={newEntry.content}
                onChange={(e) => setNewEntry(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
              <Button onClick={addEntry}>Add Entry</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {entries.slice(0, 3).map(entry => (
                  <div key={entry.id} className="border-b pb-2">
                    <h4 className="font-semibold">{entry.title}</h4>
                    <p className="text-sm text-gray-600">{entry.date}</p>
                    <p className="text-sm">{entry.content.slice(0, 100)}...</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Trip Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={generateSummary} disabled={isGeneratingSummary || entries.length === 0}>
                {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
              </Button>
              {summary && (
                <p className="mt-2 text-sm">{summary}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
