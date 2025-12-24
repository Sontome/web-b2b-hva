
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Plane, Phone, Facebook, Building2, MapPin, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InkSplashEffect } from '@/components/InkSplashEffect';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { signIn, signUp, user, loading, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [inkSplash, setInkSplash] = useState({ active: false, x: 0, y: 0 });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });

  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    linkfacebook: '',
    agentName: '',
    address: '',
    businessNumber: '',
  });

  // Handle auth callback from URL (magic link, recovery, etc.)
  useEffect(() => {
    const handleAuthCallback = async () => {
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const queryParams = new URLSearchParams(location.search);
      
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
      
      if (errorDescription) {
        toast({
          variant: "destructive",
          title: "Lỗi xác thực",
          description: decodeURIComponent(errorDescription.replace(/\+/g, ' ')),
        });
        return;
      }
      
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          toast({
            variant: "destructive",
            title: "Lỗi",
            description: error.message,
          });
          return;
        }
        
        // If it's a recovery (password reset) type, show password update form
        if (type === 'recovery') {
          setShowPasswordUpdate(true);
          toast({
            title: "Đăng nhập thành công",
            description: "Vui lòng cập nhật mật khẩu mới của bạn.",
          });
        } else {
          // Magic link login - redirect to home
          toast({
            title: "Đăng nhập thành công",
            description: "Chào mừng bạn quay trở lại!",
          });
          navigate('/');
        }
        
        // Clear the URL hash/query params
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    
    handleAuthCallback();
  }, [location, navigate, toast]);

  // Redirect authenticated users to home (if not in password update mode)
  useEffect(() => {
    if (user && !loading && !showPasswordUpdate) {
      navigate('/');
    }
  }, [user, loading, navigate, showPasswordUpdate]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }
    
    setAuthLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.message,
        });
      } else {
        toast({
          title: "Thành công",
          description: "Mật khẩu đã được cập nhật.",
        });
        setShowPasswordUpdate(false);
        navigate('/');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    // Get button position for ink splash effect
    const buttonRect = loginButtonRef.current?.getBoundingClientRect();
    const clickX = buttonRect ? buttonRect.left + buttonRect.width / 2 : window.innerWidth / 2;
    const clickY = buttonRect ? buttonRect.top + buttonRect.height / 2 : window.innerHeight / 2;

    try {
      const { error } = await signIn(signInForm.email, signInForm.password);
      
      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast({
            variant: "destructive",
            title: "Lỗi đăng nhập",
            description: "Email hoặc mật khẩu không chính xác",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Lỗi đăng nhập",
            description: error.message,
          });
        }
      } else {
        // Trigger ink splash effect on successful login
        setInkSplash({ active: true, x: clickX, y: clickY });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng nhập email",
      });
      return;
    }

    setAuthLoading(true);
    try {
      const result = await resetPassword(forgotPasswordEmail);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error.message,
        });
      } else {
        toast({
          title: "Thành công",
          description: "Link đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
      });
      return;
    }

    if (signUpForm.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    if (!signUpForm.phone.trim()) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số điện thoại là bắt buộc",
      });
      return;
    }

    setAuthLoading(true);

    try {
      const { error } = await signUp(
        signUpForm.email,
        signUpForm.password,
        signUpForm.fullName,
        signUpForm.phone,
        signUpForm.linkfacebook,
        signUpForm.agentName,
        signUpForm.address,
        signUpForm.businessNumber
      );

      if (error) {
        if (error.message === 'User already registered') {
          toast({
            variant: "destructive",
            title: "Lỗi đăng ký",
            description: "Email này đã được đăng ký",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Lỗi đăng ký",
            description: error.message,
          });
        }
      } else {
        toast({
          title: "Đăng ký thành công",
          description: "Bạn hãy vào email để xác nhận và liên hệ Admin để nâng cấp lên tài khoản đại lý.",
        });
        setActiveTab('signin');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "Có lỗi xảy ra",
        description: "Vui lòng thử lại sau.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show password update form when user comes from recovery link
  if (showPasswordUpdate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Plane className="h-8 w-8 text-blue-600 mr-2" />
              <CardTitle className="text-2xl font-bold text-blue-600">Cập nhật mật khẩu</CardTitle>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Nhập mật khẩu mới của bạn
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Mật khẩu mới</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  'Cập nhật mật khẩu'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Plane className="h-8 w-8 text-blue-600 mr-2" />
            <CardTitle className="text-2xl font-bold text-blue-600">FlightSearch</CardTitle>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Đăng nhập để sử dụng dịch vụ tìm kiếm chuyến bay
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
              <TabsTrigger value="signup">Đăng ký đại lý</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={signInForm.email}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signInForm.password}
                      onChange={(e) => setSignInForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <Button 
                  ref={loginButtonRef}
                  type="submit" 
                  className="w-full" 
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng nhập...
                    </>
                  ) : (
                    'Đăng nhập'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-blue-600"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Quên mật khẩu?
                </Button>
              </form>

              {/* Forgot Password Modal */}
              {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <Card className="w-full max-w-md mx-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Quên mật khẩu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="forgot-email"
                              type="email"
                              placeholder="your@email.com"
                              className="pl-10"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setShowForgotPassword(false);
                              setForgotPasswordEmail('');
                            }}
                          >
                            Hủy
                          </Button>
                          <Button type="submit" className="flex-1" disabled={authLoading}>
                            {authLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Gửi email'
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-agent-name">Tên đại lý</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-agent-name"
                      type="text"
                      placeholder="Công ty TNHH Du lịch ABC"
                      className="pl-10"
                      value={signUpForm.agentName}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, agentName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Họ và tên người đại diện</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Nguyễn Văn A"
                      className="pl-10"
                      value={signUpForm.fullName}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-address">Địa chỉ</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-address"
                      type="text"
                      placeholder="123 Đường ABC, Quận 1, TP.HCM"
                      className="pl-10"
                      value={signUpForm.address}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, address: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-business-number">Mã số doanh nghiệp (tùy chọn)</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-business-number"
                      type="text"
                      placeholder="0123456789"
                      className="pl-10"
                      value={signUpForm.businessNumber}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, businessNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-10"
                      value={signUpForm.email}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+84 123 456 789"
                      className="pl-10"
                      value={signUpForm.phone}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, phone: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-facebook">Link Facebook (tùy chọn)</Label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-facebook"
                      type="url"
                      placeholder="https://facebook.com/yourprofile"
                      className="pl-10"
                      value={signUpForm.linkfacebook}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, linkfacebook: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signUpForm.password}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signUpForm.confirmPassword}
                      onChange={(e) => setSignUpForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang đăng ký...
                    </>
                  ) : (
                    'Đăng ký đại lý'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <InkSplashEffect
        isActive={inkSplash.active}
        x={inkSplash.x}
        y={inkSplash.y}
        onComplete={() => {
          setInkSplash({ active: false, x: 0, y: 0 });
          navigate('/'); // Navigate sau khi splash xong
        }}

      />
    </div>
  );
}
