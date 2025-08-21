import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Shield, Camera } from 'lucide-react';
import { useUserProfile } from './UserProfileContext';

interface AccountSettingsScreenProps {
  onNavigate: (tab: string) => void;
}

export function AccountSettingsScreen({ onNavigate }: AccountSettingsScreenProps) {
  const { userProfile, updateUserProfile, refreshUserProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  const profileToState = () => ({
    firstName: userProfile.firstName || userProfile.name.split(' ')[0] || '',
    lastName: userProfile.lastName || userProfile.name.split(' ').slice(1).join(' ') || '',
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    dateOfBirth: userProfile.dateOfBirth || '',
    address: userProfile.address || '',
    bio: userProfile.bio || '',
    avatar: userProfile.avatar || '',
  });

  const [userData, setUserData] = useState(profileToState());
  const [originalData, setOriginalData] = useState(profileToState());

  useEffect(() => {
    const data = profileToState();
    setUserData(data);
    setOriginalData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  const handleSave = async () => {
    await updateUserProfile({
      firstName: userData.firstName,
      lastName: userData.lastName,
      name: `${userData.firstName} ${userData.lastName}`.trim(),
      email: userData.email,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      address: userData.address,
      bio: userData.bio,
      avatar: userData.avatar,
    });
    await refreshUserProfile();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setUserData(originalData);
    setIsEditing(false);
  };

  const updateField = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const storedAuth = localStorage.getItem('biltip_auth');
      const token = storedAuth ? JSON.parse(storedAuth).token : null;
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch(`/api/users/${userProfile.id}/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      const data = await response.json();
      const avatarUrl = data.avatar || data.avatarUrl || data.url;
      if (avatarUrl) {
        setUserData(prev => ({ ...prev, avatar: avatarUrl }));
        updateUserProfile({ avatar: avatarUrl });
      }
    } catch (error) {
      console.error('Error uploading profile photo:', error);
    }
  };

  return (
    <div className="pb-20">
      {/* Static Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('profile')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1>Account Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your profile information</p>
            </div>
          </div>
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="h-4 w-4 mr-1" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">

      {/* Profile Picture */}
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {userData.avatar && <AvatarImage src={userData.avatar} />}
              <AvatarFallback className="text-xl">
                {userData.firstName[0]}{userData.lastName[0]}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handlePhotoSelect}
                  className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1">
            <h3>{userData.firstName} {userData.lastName}</h3>
            <p className="text-sm text-muted-foreground">{userData.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
              <Badge variant="secondary">
                Member since March 2023
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Personal Information */}
      <Card className="p-6">
        <h3 className="mb-4">Personal Information</h3>
        <div className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm">First Name</label>
              {isEditing ? (
                <Input
                  value={userData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                />
              ) : (
                <p className="p-3 bg-muted rounded-md">{userData.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm">Last Name</label>
              {isEditing ? (
                <Input
                  value={userData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
              ) : (
                <p className="p-3 bg-muted rounded-md">{userData.lastName}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Date of Birth */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm">Date of Birth</label>
            </div>
            {isEditing ? (
              <Input
                type="date"
                value={userData.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
              />
            ) : (
              <p className="p-3 bg-muted rounded-md">
                {new Date(userData.dateOfBirth).toLocaleDateString()}
              </p>
            )}
          </div>

          <Separator />

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm">Bio</label>
            {isEditing ? (
              <textarea
                value={userData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                className="w-full p-3 border rounded-md resize-none"
                rows={3}
                placeholder="Tell us about yourself"
              />
            ) : (
              <p className="p-3 bg-muted rounded-md">{userData.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="mb-4">Contact Information</h3>
        <div className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm">Email Address</label>
            </div>
            {isEditing ? (
              <Input
                type="email"
                value={userData.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            ) : (
              <p className="p-3 bg-muted rounded-md">{userData.email}</p>
            )}
          </div>

          <Separator />

          {/* Phone */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm">Phone Number</label>
            </div>
            {isEditing ? (
              <Input
                type="tel"
                value={userData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            ) : (
              <p className="p-3 bg-muted rounded-md">{userData.phone}</p>
            )}
          </div>

          <Separator />

          {/* Address */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm">Address</label>
            </div>
            {isEditing ? (
              <textarea
                value={userData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="w-full p-3 border rounded-md resize-none"
                rows={2}
                placeholder="Enter your address"
              />
            ) : (
              <p className="p-3 bg-muted rounded-md">{userData.address}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Save/Cancel Buttons */}
      {isEditing && (
        <div className="flex gap-3">
          <Button onClick={handleCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Changes
          </Button>
        </div>
      )}

      {/* Verification Status */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-full">
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-green-800">Account Verified</h3>
            <p className="text-sm text-green-600">
              Your identity has been verified and your account is secure.
            </p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-destructive/20">
        <h3 className="text-destructive mb-4">Danger Zone</h3>
        <div className="space-y-3">
          <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            Deactivate Account
          </Button>
          <Button variant="destructive" className="w-full">
            Delete Account
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          These actions cannot be undone. Please be certain.
        </p>
      </Card>
      </div>
    </div>
  );
}