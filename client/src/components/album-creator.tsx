import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { routeApiCall } from '@/lib/offline';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Photo {
  file: File;
  url: string;
  caption: string;
  id: string;
}

interface Album {
  title: string;
  description: string;
  photos: Array<{
    id: string;
    caption: string;
    tags: string[];
    context: string;
  }>;
  highlights: string[];
  story: string;
}

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function AlbumCreator() {
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [albumTitle, setAlbumTitle] = useState('My Trip Album');
  const [captionStyle, setCaptionStyle] = useState<'casual' | 'poetic' | 'descriptive' | 'funny'>('casual');
  const [generatedAlbum, setGeneratedAlbum] = useState<Album | null>(null);
  const [isGeneratingAlbum, setIsGeneratingAlbum] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
        caption: ''
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
      
      toast({
        title: "Photos Added",
        description: `Added ${newPhotos.length} photo(s) to your album`,
      });
    }
  };

  const generateCaptions = async () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please upload photos first",
        variant: "default"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const updatedPhotos = await Promise.all(
        photos.map(async (photo) => {
          try {
            // Convert to base64
            const base64 = await fileToBase64(photo.file);
            
            // Call Photo Agent API
            const response = await routeApiCall('POST', '/api/photos/caption', {
              imageData: base64,
              context: {
                style: captionStyle
              }
            });
            
            const data = await response.json();
            
            if (data.success) {
              return { ...photo, caption: data.caption };
            }
            return { ...photo, caption: 'A beautiful moment captured 📸' };
          } catch (error) {
            console.error('Error generating caption for photo:', error);
            return { ...photo, caption: 'A memorable experience ✨' };
          }
        })
      );
      
      setPhotos(updatedPhotos);
      
      toast({
        title: "Captions Generated!",
        description: `Created ${updatedPhotos.length} AI-powered captions`,
      });
    } catch (error) {
      console.error('Error generating captions:', error);
      toast({
        title: "Error",
        description: "Failed to generate captions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCompleteAlbum = async () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please upload photos first",
        variant: "default"
      });
      return;
    }

    setIsGeneratingAlbum(true);
    try {
      // Convert all photos to base64
      const photosWithBase64 = await Promise.all(
        photos.map(async (photo) => ({
          id: photo.id,
          base64: await fileToBase64(photo.file),
          location: undefined, // Could be extracted from EXIF
          timestamp: new Date().toISOString()
        }))
      );

      // Call Album Agent API
      const response = await routeApiCall('POST', '/api/photos/album', {
        photos: photosWithBase64,
        albumInfo: {
          title: albumTitle,
          style: captionStyle
        }
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedAlbum(data.album);
        
        // Update photos with generated captions
        const updatedPhotos = photos.map(photo => {
          const albumPhoto = data.album.photos.find((p: any) => p.id === photo.id);
          return albumPhoto ? { ...photo, caption: albumPhoto.caption } : photo;
        });
        setPhotos(updatedPhotos);

        toast({
          title: "Album Created!",
          description: `Your ${data.album.title} is ready with AI-generated story and captions`,
        });
      }
    } catch (error) {
      console.error('Error generating album:', error);
      toast({
        title: "Error",
        description: "Failed to generate album. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAlbum(false);
    }
  };

  const exportToPDF = async () => {
    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Add photos to create a PDF",
        variant: "default"
      });
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Title page
    pdf.setFontSize(24);
    pdf.text(generatedAlbum?.title || albumTitle, pageWidth / 2, 40, { align: 'center' });
    
    if (generatedAlbum?.description) {
      pdf.setFontSize(12);
      const descLines = pdf.splitTextToSize(generatedAlbum.description, pageWidth - 40);
      pdf.text(descLines, pageWidth / 2, 60, { align: 'center' });
    }

    // Album story
    if (generatedAlbum?.story) {
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Our Story', 20, 20);
      pdf.setFontSize(11);
      const storyLines = pdf.splitTextToSize(generatedAlbum.story, pageWidth - 40);
      pdf.text(storyLines, 20, 35);
    }

    // Photos with captions
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      pdf.addPage();
      
      try {
        const base64 = await fileToBase64(photo.file);
        const imgWidth = pageWidth - 40;
        const imgHeight = 120;
        pdf.addImage(base64, 'JPEG', 20, 20, imgWidth, imgHeight);
        
        pdf.setFontSize(11);
        const captionLines = pdf.splitTextToSize(photo.caption || 'A memorable moment', pageWidth - 40);
        pdf.text(captionLines, 20, imgHeight + 30);

        // Add tags if available from generated album
        const albumPhoto = generatedAlbum?.photos.find(p => p.id === photo.id);
        if (albumPhoto?.tags && albumPhoto.tags.length > 0) {
          pdf.setFontSize(9);
          pdf.setTextColor(100);
          pdf.text(`Tags: ${albumPhoto.tags.join(', ')}`, 20, imgHeight + 50);
          pdf.setTextColor(0);
        }
      } catch (error) {
        console.error('Error adding photo to PDF:', error);
      }
    }

    pdf.save(`${albumTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    
    toast({
      title: "PDF Exported!",
      description: "Your photo album has been downloaded",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
        >
          <i className="fas fa-camera text-purple-500 mr-2"></i>
          <span className="font-medium">Create Album</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📸 AI-Powered Album Creator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Album Title"
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
            />
            <Select value={captionStyle} onValueChange={(value: any) => setCaptionStyle(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Caption Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">😊 Casual & Friendly</SelectItem>
                <SelectItem value="poetic">🎨 Poetic & Artistic</SelectItem>
                <SelectItem value="descriptive">📝 Detailed & Descriptive</SelectItem>
                <SelectItem value="funny">😄 Fun & Witty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="cursor-pointer"
          />

          {photos.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={photo.id} className="space-y-2 border rounded-lg p-2">
                    <img
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded"
                    />
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {photo.caption || 'No caption yet'}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}
                      className="w-full text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              {/* Generated Album Info */}
              {generatedAlbum && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg space-y-3">
                  <div>
                    <h3 className="font-bold text-lg">{generatedAlbum.title}</h3>
                    <p className="text-sm text-gray-600">{generatedAlbum.description}</p>
                  </div>
                  
                  {generatedAlbum.highlights.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm">✨ Highlights:</h4>
                      <ul className="text-xs space-y-1 ml-4">
                        {generatedAlbum.highlights.map((highlight, idx) => (
                          <li key={idx}>• {highlight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-sm">📖 Your Story:</h4>
                    <p className="text-xs text-gray-700">{generatedAlbum.story}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button 
                  onClick={generateCaptions} 
                  disabled={isGenerating}
                  variant="outline"
                  className="flex-1"
                >
                  {isGenerating ? '🤖 Generating Captions...' : '✨ Generate Captions'}
                </Button>
                <Button 
                  onClick={generateCompleteAlbum} 
                  disabled={isGeneratingAlbum}
                  className="flex-1"
                >
                  {isGeneratingAlbum ? '🤖 Creating Album...' : '🎨 Create Full Album'}
                </Button>
                <Button 
                  onClick={exportToPDF}
                  variant="secondary"
                  className="flex-1"
                >
                  📄 Export to PDF
                </Button>
              </div>
            </>
          )}

          {photos.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">📷 No photos yet</p>
              <p className="text-sm">Upload photos to start creating your AI-powered album!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
