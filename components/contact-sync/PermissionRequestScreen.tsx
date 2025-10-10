import {
  ArrowLeft,
  AlertCircle,
  Smartphone,
  FileText,
  Upload,
  MessageCircle,
  Shield,
  UserPlus,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { ContactSyncScreenProps } from "./types";
import { contactsAPI } from "../../utils/contacts-api";

interface PermissionRequestScreenProps extends ContactSyncScreenProps {
  contactsSupported: boolean;
  requestContactPermission: () => Promise<void>;
  handleFileImport: () => Promise<void>;
  handleDemoMode?: () => Promise<void>;
  denyPermission: () => void;
  hasPermission?: boolean | null;
}

export function PermissionRequestScreen({
  onNavigate: _onNavigate,
  contactsSupported,
  requestContactPermission,
  handleFileImport,
  handleDemoMode,
  denyPermission,
  hasPermission: _hasPermission,
}: PermissionRequestScreenProps) {
  const isInCrossOrigin = contactsAPI.isInCrossOriginContext();
  const shouldUseFileInput = contactsAPI.shouldUseFileInput();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => _onNavigate("add-friend")}
              className="min-h-[44px] min-w-[44px] -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Sync Contacts</h1>
              <p className="text-sm text-muted-foreground">
                Find friends on Biltip
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Main Card */}
        <Card className="overflow-hidden">
          {/* Hero Section */}
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-xl mb-2">Connect with Friends</CardTitle>
            <p className="text-muted-foreground">
              Find friends who are already using Biltip and invite others via
              WhatsApp.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Benefits Grid */}
            <div className="grid gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Find existing users</p>
                  <p className="text-xs text-muted-foreground">
                    Connect instantly with friends already on Biltip
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">WhatsApp invitations</p>
                  <p className="text-xs text-muted-foreground">
                    Send personalized invites through WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Private & secure</p>
                  <p className="text-xs text-muted-foreground">
                    Contacts are processed locally and never stored
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Lightning fast</p>
                  <p className="text-xs text-muted-foreground">
                    Sync thousands of contacts in seconds
                  </p>
                </div>
              </div>
            </div>

            {/* Browser Limitations Warning */}
            {(!contactsSupported || isInCrossOrigin) && (
              <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                        {isInCrossOrigin
                          ? "Limited Access Mode"
                          : "Web Browser Mode"}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        {isInCrossOrigin
                          ? "Contact sync works best in our mobile app. You can import a file or try our demo."
                          : "For the best experience, use our mobile app. File import and demo are available."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Primary Action - Contact Access */}
              <Button
                onClick={requestContactPermission}
                className="w-full min-h-[52px] text-base font-medium bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <Smartphone className="h-5 w-5 mr-3" />
                {contactsSupported
                  ? "Allow Contact Access"
                  : "Try Demo Version"}
                {contactsSupported && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-white/20 text-white border-0 text-xs"
                  >
                    Recommended
                  </Badge>
                )}
              </Button>

              {/* Alternative Options */}
              <div className="grid gap-2">
                {/* File Import */}
                {(!contactsSupported || shouldUseFileInput) && (
                  <Button
                    variant="outline"
                    onClick={handleFileImport}
                    className="w-full min-h-[48px]"
                  >
                    {shouldUseFileInput ? (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Contact File
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Import Contact File
                      </>
                    )}
                  </Button>
                )}

                {/* Demo Mode */}
                {handleDemoMode && (
                  <Button
                    variant="outline"
                    onClick={handleDemoMode}
                    className="w-full min-h-[48px]"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Try Demo
                  </Button>
                )}

                {/* Skip Option */}
                <Button
                  variant="ghost"
                  onClick={denyPermission}
                  className="w-full min-h-[48px] text-muted-foreground"
                >
                  Skip for Now
                </Button>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground leading-relaxed">
                <Shield className="h-3 w-3 inline mr-1" />
                Your privacy matters. Contacts are processed securely on your
                device and are never stored on our servers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* File Import Instructions */}
        {(!contactsSupported || shouldUseFileInput) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                How to Import Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium">
                      Export contacts from your phone
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Save as CSV or VCF file from your contacts app
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Transfer file to this device</p>
                    <p className="text-muted-foreground text-xs">
                      Email to yourself or use cloud storage
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Import and sync</p>
                    <p className="text-muted-foreground text-xs">
                      Click "
                      {shouldUseFileInput
                        ? "Upload Contact File"
                        : "Import Contact File"}
                      " above
                    </p>
                  </div>
                </div>
              </div>

              {isInCrossOrigin && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Due to security restrictions, a file selection dialog will
                    open when you click the import button.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Card className="bg-gradient-to-r from-primary/5 to-green-500/5">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium mb-2">Join millions of users</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-primary">2M+</p>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600">50M+</p>
                  <p className="text-xs text-muted-foreground">Bills Split</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-blue-600">99.9%</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
