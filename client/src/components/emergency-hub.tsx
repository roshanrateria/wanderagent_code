import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export default function EmergencyHub() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });
  const [safetyTips, setSafetyTips] = useState<string[]>([]);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    setContacts(prev => [...prev, newContact]);
    setNewContact({ name: '', phone: '', relation: '' });
  };

  const generateSafetyTips = async () => {
    setIsGeneratingTips(true);
    try {
      const prompt = `Provide 5 essential safety tips for travelers in a new city. Focus on personal safety, health, and emergency preparedness.`;
      const response = await apiRequest('POST', '/api/gemini', { prompt });
      const data = await response.json();
      const tipsText = data.caption;
      setSafetyTips(tipsText.split('\n').filter((t: string) => t.trim()));
    } catch (error) {
      console.error('Error generating tips:', error);
      setSafetyTips([
        'Stay aware of your surroundings.',
        'Keep important documents secure.',
        'Have local emergency numbers saved.',
        'Stay hydrated and take breaks.',
        'Share your location with trusted contacts.'
      ]);
    } finally {
      setIsGeneratingTips(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all"
        >
          <i className="fas fa-shield-alt text-red-500 mr-2"></i>
          <span className="font-medium">Emergency Hub</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emergency & Safety Hub</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Phone Number"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
              />
              <Input
                placeholder="Relation"
                value={newContact.relation}
                onChange={(e) => setNewContact(prev => ({ ...prev, relation: e.target.value }))}
              />
              <Button onClick={addContact}>Add Contact</Button>
              <div className="mt-4 space-y-2">
                {contacts.map((contact, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{contact.name} ({contact.relation})</span>
                    <a href={`tel:${contact.phone}`} className="text-blue-500">{contact.phone}</a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Local Emergency Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Police: <a href="tel:911" className="text-blue-500">911</a> (US) or local equivalent</p>
              <p>Medical: <a href="tel:911" className="text-blue-500">911</a> or local ambulance</p>
              <p>Embassy: Search for your country's embassy in the area</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Safety Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={generateSafetyTips} disabled={isGeneratingTips}>
                {isGeneratingTips ? 'Generating...' : 'Get Safety Tips'}
              </Button>
              <ul className="mt-2 space-y-1">
                {safetyTips.map((tip, index) => (
                  <li key={index} className="text-sm">• {tip}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
