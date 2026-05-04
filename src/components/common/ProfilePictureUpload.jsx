import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Loader2 } from 'lucide-react';
import { compressImage, cropToSquare } from '@/lib/avatarHelpers';
import { toast } from 'sonner';
import UserAvatar from './UserAvatar';

export default function ProfilePictureUpload({ user, onSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP formats are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    try {
      // Crop to square
      const squareBlob = await cropToSquare(file);
      const previewUrl = URL.createObjectURL(squareBlob);
      setPreview(previewUrl);
    } catch (error) {
      toast.error('Failed to process image');
    }
  };

  const handleUpload = async () => {
    if (!preview) return;
    setIsLoading(true);
    try {
      // Fetch the object URL blob, compress it, convert to base64, then upload
      const fetchRes = await fetch(preview);
      const blob = await fetchRes.blob();
      const compressedBlob = await compressImage(blob);

      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(compressedBlob);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const uploadResult = await base44.integrations.Core.UploadFile({ file: base64String });
      if (!uploadResult?.file_url) throw new Error('Upload returned no URL');

      const schoolUser = await base44.entities.SchoolUser.update(user.id, {
        profilePictureUrl: uploadResult.file_url,
      });

      toast.success('Profile picture updated');
      setIsOpen(false);
      setPreview(null);
      onSuccess?.(schoolUser);
    } catch (error) {
      toast.error('Failed to upload picture');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!user.profilePictureUrl) return;

    setIsLoading(true);
    try {
      const schoolUser = await base44.entities.SchoolUser.update(user.id, {
        profilePictureUrl: null,
      });
      toast.success('Profile picture removed');
      onSuccess?.(schoolUser);
    } catch (error) {
      toast.error('Failed to remove picture');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size="lg" />
        <div>
          <h3 className="font-semibold">{user?.fullName}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={() => setIsOpen(true)} variant="outline">
          Change Photo
        </Button>
        {user?.profilePictureUrl && (
          <Button
            onClick={handleRemove}
            variant="outline"
            disabled={isLoading}
          >
            Remove Photo
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Picture</DialogTitle>
          </DialogHeader>

          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">
                JPG, PNG, or WEBP (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                Choose Different Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setPreview(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!preview || isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}