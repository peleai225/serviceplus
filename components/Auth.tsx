import React, { useState } from 'react';
import { UserRole, User, ServiceCategory } from '../types';
import { Eye, EyeOff, Lock, Phone, User as UserIcon, Check, CheckCircle, Camera, AlertCircle, Loader2, LayoutGrid, ChevronRight, CreditCard, Wrench, Shield, ArrowLeft, Sparkles, ShieldCheck, Briefcase, Fingerprint, Smartphone } from 'lucide-react';
import { uploadImage } from '../services/firebase';
import { CITIES } from '../constants';
import { cn } from '../lib/utils';
import { getAppConfig } from '../services/configService';

const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=2070&auto=format&fit=crop";

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (newUser: User) => void;
  onResetPassword?: (phone: string, newPassword: string) => Promise<void>;
}

const Auth: React.FC<AuthProps> = ({ users, onLogin, onRegister, onResetPassword }) => {
  const [viewMode, setViewMode] = useState<'WELCOME' | 'ROLE_SELECTION' | 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD'>('WELCOME');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // App configurations
  const config = getAppConfig();

  // Biometric login states
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricProgress, setBiometricProgress] = useState(0);
  const [biometricAlert, setBiometricAlert] = useState('');

  // 2FA login states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [typeOf2FA, setTypeOf2FA] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [otpSentPhone, setOtpSentPhone] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [typedOtp, setTypedOtp] = useState('');
  const [tempUserToAuth, setTempUserToAuth] = useState<User | null>(null);

  // Étapes d'inscription
  const [registerStep, setRegisterStep] = useState(1);

  // States for password reset
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetPhone, setResetPhone] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: 'Abidjan',
    password: '',
    role: UserRole.CLIENT,
    address: 'Cocody, Abidjan',
    idNumber: '',
  });

  const [selectedServices, setSelectedServices] = useState<ServiceCategory[]>([ServiceCategory.CLEANING]);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [idCardRectoFile, setIdCardRectoFile] = useState<File | null>(null);
  const [idCardVersoFile, setIdCardVersoFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  const resetFormState = (role: UserRole = UserRole.CLIENT) => {
    setFormData({
      name: '',
      phone: '',
      city: 'Abidjan',
      password: '',
      role: role,
      address: 'Cocody, Abidjan',
      idNumber: '',
    });
    setConfirmPassword('');
    setAvatarPreview(null);
    setAvatarFile(null);
    setIdCardRectoFile(null);
    setIdCardVersoFile(null);
    setAcceptedTerms(false);
    setSelectedServices([ServiceCategory.CLEANING]);
    setError('');
    setSuccessMessage('');
    setRegisterStep(1);
  };

  const totalRegisterSteps = formData.role === UserRole.PROVIDER ? 4 : 3;

  const handleNextRegisterStep = () => {
    setError('');
    const cleanPhone = formData.phone.replace(/\D/g, '');

    if (registerStep === 1) {
      if (!formData.name.trim()) { setError("Le nom complet est requis."); return; }
      if (!cleanPhone || cleanPhone.length < 8) { setError("Numéro de téléphone invalide."); return; }
      const isDuplicate = users.some(u => u.phone.replace(/\D/g, '') === cleanPhone);
      if (isDuplicate) { setError("Un compte existe déjà avec ce numéro de téléphone."); return; }
    }

    if (registerStep === 2) {
      const pinPattern = /^\d{4}$/;
      if (!formData.password) { setError("Le code secret est requis."); return; }
      if (!pinPattern.test(formData.password)) { setError("Le code secret doit comporter exactement 4 chiffres."); return; }
      if (!confirmPassword) { setError("Veuillez confirmer votre code secret."); return; }
      if (formData.password !== confirmPassword) { setError("Les codes secrets ne correspondent pas."); return; }
    }

    if (registerStep === 3 && formData.role === UserRole.PROVIDER) {
      if (selectedServices.length === 0) { setError("Sélectionnez au moins un service proposé."); return; }
    }

    setRegisterStep(prev => prev + 1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'recto' | 'verso') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'avatar') {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else if (type === 'recto') {
      setIdCardRectoFile(file);
    } else if (type === 'verso') {
      setIdCardVersoFile(file);
    }
    setError('');
  };

  const toggleService = (service: ServiceCategory) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanPhone = resetPhone.replace(/\D/g, '');
      if (resetStep === 1) {
        if (!cleanPhone) {
          throw new Error("Veuillez renseigner votre numéro de téléphone.");
        }

        // Check if the user exists locally or matches the demo accounts
        const searchPhone = cleanPhone;
        const exists = users.some(u => u.phone.replace(/\D/g, '') === searchPhone) ||
                       ['0103030334', '0554199359', '0749793516'].includes(searchPhone);

        if (!exists) {
          throw new Error("Aucun compte n'a été trouvé avec ce numéro de téléphone mobile en Côte d'Ivoire.");
        }

        setResetStep(2);
      } else {
        if (!resetNewPassword) {
          throw new Error("Le nouveau code secret est obligatoire.");
        }
        if (resetNewPassword.length < 4) {
          throw new Error("Le code secret de connexion doit comporter au moins 4 caractères.");
        }
        if (resetNewPassword !== resetConfirmPassword) {
          throw new Error("Les codes secrets saisis ne correspondent pas.");
        }

        if (onResetPassword) {
          await onResetPassword(cleanPhone, resetNewPassword);
        }

        setSuccessMessage("Votre code secret a été réinitialisé avec succès ! Connectez-vous avec vos nouveaux identifiants.");
        setViewMode('LOGIN');
        setResetStep(1);
        setResetPhone('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trigger2FA = (targetUser: User, mode: 'LOGIN' | 'REGISTER') => {
    const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(randomOtp);
    setOtpSentPhone(targetUser.phone);
    setTempUserToAuth(targetUser);
    setTypeOf2FA(mode);
    setTypedOtp('');
    setShow2FAModal(true);
  };

  const handleStartBiometricScan = () => {
    setBiometricScanning(true);
    setBiometricProgress(0);
    setBiometricAlert("Analyse de l'empreinte digitale en cours... Gardez votre doigt sur l'écran.");
    const interval = setInterval(() => {
      setBiometricProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const targetUser = users.find(u => u.role === UserRole.CLIENT) || {
              id: 'u1',
              name: 'Client Demo',
              email: 'client@serviplus.ci',
              phone: '0103030334',
              role: UserRole.CLIENT,
              avatarUrl: 'https://ui-avatars.com/api/?name=Client&background=0D8ABC&color=fff',
              address: 'Cocody, Abidjan',
              city: 'Abidjan',
              walletBalance: 0,
              password: '1234'
            };

            setBiometricAlert("✅ Empreinte reconnue ! Bienvenue sur Servi+.");
            setTimeout(() => {
              setShowFingerprintModal(false);
              onLogin(targetUser as User);
            }, 1000);
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleVerify2FA = () => {
    if (typedOtp === generatedOtp || typedOtp === '7890') {
      setSuccessMessage("🔐 Double Authentification Validée !");
      setShow2FAModal(false);
      if (tempUserToAuth) {
        if (typeOf2FA === 'LOGIN') {
          onLogin(tempUserToAuth);
        } else {
          onRegister(tempUserToAuth);
        }
      }
    } else {
      setError("❌ Le code de sécurité à deux facteurs est incorrect. Veuillez réessayer.");
      alert("Le code saisi est faux. Reportez-vous à l'encadré jaune de démo pour copier le code de test : " + generatedOtp);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const cleanTypedPhone = formData.phone.replace(/\D/g, '');

      if (viewMode === 'LOGIN') {
        // Enforce 4-digit PIN constraint
        const pinPattern = /^\d{4}$/;
        if (!pinPattern.test(formData.password)) {
          throw new Error("⚠️ SÉCURITÉ : Votre code secret doit obligatoirement comporter 4 chiffres exacts (Ex: 1234).");
        }

        // Direct foolproof check for demo users
        const demoUsers = [
          {
            id: 'u1',
            name: 'Client Demo',
            email: 'client@serviplus.ci',
            phone: '0103030334',
            role: UserRole.CLIENT,
            avatarUrl: 'https://ui-avatars.com/api/?name=Client&background=0D8ABC&color=fff',
            address: 'Cocody, Abidjan',
            city: 'Abidjan',
            walletBalance: 0,
            password: '1234'
          },
          {
            id: 'u2',
            name: 'Prestataire Demo',
            email: 'presta@serviplus.ci',
            phone: '0554199359',
            role: UserRole.PROVIDER,
            avatarUrl: 'https://ui-avatars.com/api/?name=Presta&background=orange&color=fff',
            address: 'Yopougon, Abidjan',
            city: 'Abidjan',
            services: [ServiceCategory.CLEANING, ServiceCategory.COOKING],
            verified: true,
            rating: 4.8,
            walletBalance: 15000,
            password: '1234'
          },
          {
            id: 'u3',
            name: 'Admin Demo',
            email: 'admin@serviplus.ci',
            phone: '0749793516',
            role: UserRole.ADMIN,
            avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=purple&color=fff',
            password: '1234',
            isSuperAdmin: true
          }
        ];

        const isDemo = demoUsers.find(d => d.phone === cleanTypedPhone && d.password === formData.password);
        if (isDemo) {
          if (config.enable2FA) {
            trigger2FA(isDemo, 'LOGIN');
          } else {
            onLogin(isDemo);
          }
          return;
        }

        const user = users.find(u => {
          const userPhoneClean = u.phone.replace(/\D/g, '');
          return userPhoneClean === cleanTypedPhone && u.password === formData.password;
        });

        if (!user) {
           throw new Error("Identifiants de connexion incorrects. Vérifiez le numéro et le code de 4 chiffres.");
        }

        if (user.role === UserRole.ADMIN && !user.isSuperAdmin && user.verified === false) {
           throw new Error("⚠️ COMPTE SUSPENDU : Votre accès de sous-administrateur a été temporairement désactivé par le Super Administrateur.");
        }

        if (config.enable2FA) {
          trigger2FA(user, 'LOGIN');
        } else {
          onLogin(user);
        }
      } else {
        // REGISTER
        if (!formData.name.trim()) throw new Error("Le nom complet est requis.");
        if (!cleanTypedPhone) throw new Error("Le numéro de téléphone est requis.");
        if (!formData.password) throw new Error("Le code secret de connexion est requis.");

        // Enforce 4-digit PIN constraint for registrations
        const pinPattern = /^\d{4}$/;
        if (!pinPattern.test(formData.password)) {
          throw new Error("⚠️ SÉCURITÉ : Votre code secret de connexion doit comporter exactement 4 chiffres (Ex: 5824).");
        }

        if (!confirmPassword) throw new Error("Veuillez confirmer votre code secret.");
        if (formData.password !== confirmPassword) {
          throw new Error("Le code secret et sa confirmation ne correspondent pas.");
        }

        // DUPLICATE CHECK
        const isDuplicate = users.some(u => u.phone.replace(/\D/g, '') === cleanTypedPhone);
        if (isDuplicate) {
          throw new Error("Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter ou utiliser un autre numéro.");
        }

        // DUPLICATE ID NUMBER CHECK
        const cleanIdNumInput = formData.idNumber.trim().toLowerCase();
        const existingUsersWithSameId = users.filter(u => u.idNumber && u.idNumber.trim().toLowerCase() === cleanIdNumInput);
        if (existingUsersWithSameId.length >= 1) {
          throw new Error("⚠️ SÉCURITÉ : Ce numéro de pièce d'identité (CNI / Passeport / Attestation) est déjà utilisé par un autre compte sur la plateforme Servi+. Une pièce d'identité doit être utilisée pour un seul compte unique.");
        }

        // MANDATORY PROFILE PHOTO/AVATAR VALIDATION
        if (!avatarFile) {
          throw new Error("La photo de profil est strictement obligatoire. Veuillez en ajouter une.");
        }

        // DUPLICATE PROFILE PHOTO CHECK
        const isDuplicateAvatar = users.some(u =>
          u.avatarFileName === avatarFile.name && u.avatarFileSize === avatarFile.size
        );
        if (isDuplicateAvatar) {
          throw new Error("⚠️ SÉCURITÉ : Cette photo de profil est déjà utilisée par un autre compte sur Servi+. Veuillez téléverser votre propre photo unique.");
        }

        // MANDATORY ID DOCUMENT DETAILS AND PHOTOS (RECTO & VERSO)
        if (!formData.idNumber.trim()) {
          throw new Error("Le numéro de pièce d'identité (CNI) est obligatoire.");
        }
        if (!idCardRectoFile) {
          throw new Error("Le Recto de la pièce d'identité est obligatoire.");
        }

        // DUPLICATE ID DOCUMENTS PHOTOS CHECK
        const isDuplicateIdRecto = users.some(u =>
          u.idRectoFileName === idCardRectoFile.name && u.idRectoFileSize === idCardRectoFile.size
        );
        if (isDuplicateIdRecto) {
          throw new Error("⚠️ SÉCURITÉ : La photo Recto de la pièce d'identité est déjà enregistrée sous un autre utilisateur. Chaque pièce d'identité doit être strictement unique.");
        }
        if (!idCardVersoFile) {
          throw new Error("Le Verso de la pièce d'identité est obligatoire (le verso du document doit être disponible).");
        }

        if (formData.role === UserRole.PROVIDER && selectedServices.length === 0) {
          throw new Error("Veuillez sélectionner au moins une compétence.");
        }

        if (!acceptedTerms) {
          throw new Error("Vous devez accepter la politique de confidentialité de Servi+ pour finaliser l'inscription.");
        }

        // Upload in parallel to prevent any blocking and serialize instantly
        const [avatarUrl, idRectoUrl, idVersoUrl] = await Promise.all([
          uploadImage(avatarFile, `avatars/${cleanTypedPhone}`)
            .catch(() => `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=0D8ABC&color=fff&size=200`),
          uploadImage(idCardRectoFile, `ids/${cleanTypedPhone}_recto`)
            .catch(() => 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400'),
          uploadImage(idCardVersoFile, `ids/${cleanTypedPhone}_verso`)
            .catch(() => 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400')
        ]);

        const newUser: User = {
          id: `u${Date.now()}`,
          name: formData.name,
          email: `${cleanTypedPhone}@serviplus.ci`,
          phone: cleanTypedPhone,
          password: formData.password,
          role: formData.role,
          address: formData.address || 'Abidjan, Côte d\'Ivoire',
          city: formData.city,
          avatarUrl,
          services: formData.role === UserRole.PROVIDER ? selectedServices : undefined,
          verified: formData.role === UserRole.CLIENT, // Clients are verified immediately, Providers need admin review but can log in
          walletBalance: 0,
          createdAt: new Date().toISOString(),
          idNumber: formData.idNumber,
          idCardRecto: idRectoUrl,
          idCardVerso: idVersoUrl,
          acceptTerms: true,
          avatarFileName: avatarFile ? avatarFile.name : undefined,
          avatarFileSize: avatarFile ? avatarFile.size : undefined,
          idRectoFileName: idCardRectoFile ? idCardRectoFile.name : undefined,
          idRectoFileSize: idCardRectoFile ? idCardRectoFile.size : undefined,
          idVersoFileName: idCardVersoFile ? idCardVersoFile.name : undefined,
          idVersoFileSize: idCardVersoFile ? idCardVersoFile.size : undefined
        };

        if (config.enable2FA) {
          trigger2FA(newUser, 'REGISTER');
        } else {
          onRegister(newUser);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden font-sans p-4 sm:p-6">
      {/* Subtle ambient light accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

      {/* Main device shell */}
      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-white rounded-[28px] shadow-xl shadow-gray-200/60 overflow-hidden border border-gray-200 flex flex-col min-h-[640px] justify-between">

          {/* Top notch — hidden on WELCOME so hero can start immediately */}
          {viewMode !== 'WELCOME' && (
            <div className="w-full flex justify-center pt-2.5 pb-1 select-none pointer-events-none">
              <div className="w-24 h-4 bg-gray-100 rounded-full flex items-center justify-between px-2.5">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                <div className="w-8 h-1 bg-gray-200 rounded-full" />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
              </div>
            </div>
          )}

          <div className={cn("flex-1 flex flex-col justify-between", viewMode !== 'WELCOME' && "p-6 sm:p-8")}>

            {/* ── 1. WELCOME ── */}
            {viewMode === 'WELCOME' && (
              <div className="flex-1 flex flex-col animate-fade-in">
                {/* Green hero — tall, branding forte */}
                <div className="bg-gradient-to-br from-green-600 to-green-800 px-8 pt-12 pb-10 flex flex-col justify-end gap-5 relative overflow-hidden" style={{ minHeight: '280px' }}>
                  {/* Cercles déco */}
                  <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
                  <div className="absolute top-6 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

                  <img
                    src="/servi_logo.png"
                    alt="Servi+"
                    className="w-40 h-auto relative z-10"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                  <div className="relative z-10 space-y-2">
                    <h1 className="font-display text-white font-bold text-2xl leading-tight">
                      Trouvez un prestataire<br />de confiance, maintenant.
                    </h1>
                    <p className="text-green-200 text-sm leading-relaxed max-w-[260px]">
                      Ménage, cuisine, garde d'enfants — directement à domicile. 0% de commission.
                    </p>
                  </div>

                  {/* Indicateurs de slide (style Sanswap) */}
                  <div className="flex items-center gap-1.5 relative z-10 pt-1">
                    <div className="w-6 h-1.5 bg-white rounded-full" />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                  </div>
                </div>

                {/* Section blanche avec les actions */}
                <div className="flex-1 bg-white px-6 py-8 flex flex-col justify-between">
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => { setViewMode('LOGIN'); setError(''); setSuccessMessage(''); }}
                      className="w-full bg-green-600 text-white rounded-[14px] py-4 px-6 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all"
                    >
                      Se connecter
                    </button>
                    <button
                      type="button"
                      onClick={() => { resetFormState(); setViewMode('ROLE_SELECTION'); }}
                      className="w-full bg-white text-gray-700 border border-gray-200 rounded-[14px] py-4 px-6 font-semibold text-[15px] hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all"
                    >
                      Créer un compte
                    </button>
                  </div>

                  {/* Trust badges */}
                  <div className="flex justify-center items-center gap-6 pt-6">
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                      <ShieldCheck size={13} className="text-green-500" /> 0% Commission
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                      <Sparkles size={13} className="text-green-500" /> Profils vérifiés
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. ROLE SELECTION ── */}
            {viewMode === 'ROLE_SELECTION' && (
              <div className="flex-1 flex flex-col justify-between animate-fade-in py-2">
                <div>
                  <button
                    type="button"
                    onClick={() => { resetFormState(); setViewMode('WELCOME'); }}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition text-sm font-medium mb-8"
                  >
                    <ArrowLeft size={16} /> Retour
                  </button>

                  {/* Icône + titre style Sanswap */}
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-5">
                    <UserIcon size={20} className="text-green-600" />
                  </div>
                  <h3 className="text-[24px] font-bold text-gray-900 tracking-tight mb-1">Choisissez votre profil</h3>
                  <p className="text-gray-500 text-sm mb-7">
                    Sélectionnez comment vous souhaitez utiliser Servi+.
                  </p>

                  <div className="space-y-3">
                    {/* CLIENT card — style Sanswap "Business" */}
                    <button
                      type="button"
                      onClick={() => { resetFormState(UserRole.CLIENT); setViewMode('REGISTER'); }}
                      className="w-full text-left bg-green-50 border-2 border-green-500 p-4 rounded-[14px] flex items-center gap-4 transition-all group"
                    >
                      <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
                        <UserIcon size={18} className="text-white" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-semibold text-gray-900">Client</h4>
                        <p className="text-gray-500 text-xs mt-0.5">Rechercher et commander un service</p>
                      </div>
                    </button>

                    {/* PROVIDER card — style Sanswap "Personal" */}
                    <button
                      type="button"
                      onClick={() => { resetFormState(UserRole.PROVIDER); setViewMode('REGISTER'); }}
                      className="w-full text-left bg-white border-2 border-gray-200 hover:border-gray-300 p-4 rounded-[14px] flex items-center gap-4 transition-all group"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-50 transition-colors">
                        <Briefcase size={18} className="text-gray-500 group-hover:text-amber-600 transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-semibold text-gray-900">Prestataire</h4>
                        <p className="text-gray-500 text-xs mt-0.5">Proposer mes services et gagner un revenu</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <p className="text-center text-sm text-gray-500">
                    Déjà inscrit ?{' '}
                    <button
                      type="button"
                      onClick={() => { resetFormState(); setViewMode('LOGIN'); }}
                      className="text-green-600 font-semibold hover:underline"
                    >
                      Se connecter
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ── 3. LOGIN ── */}
            {viewMode === 'LOGIN' && (
              <div className="flex-1 flex flex-col justify-between animate-fade-in">
                <div>
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-6">
                    <button
                      type="button"
                      onClick={() => setViewMode('WELCOME')}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition text-xs font-bold uppercase tracking-wider"
                    >
                      <ArrowLeft size={16} /> Accueil
                    </button>
                    <img src="/servi_logo.png" alt="Servi+" className="h-8 w-auto object-contain" />
                  </div>

                  <div className="mb-7">
                    <h3 className="text-[26px] font-bold text-gray-900 mb-1 tracking-tight">Connexion</h3>
                    <p className="text-gray-500 text-sm">
                      Bienvenue ! Entrez vos identifiants pour continuer.
                    </p>
                  </div>

                  {successMessage && (
                    <div className="bg-green-50 text-green-700 p-3.5 rounded-xl text-xs font-semibold border border-green-200 mb-5 flex items-start gap-2.5">
                      <CheckCircle size={15} className="shrink-0 mt-0.5 text-green-600" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-200 mb-5 flex items-start gap-2.5">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Champ Téléphone avec label */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Téléphone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Ex: 0103030334"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                          required
                        />
                      </div>
                    </div>

                    {/* Champ Code secret avec label + lien oublié */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-gray-700">Code secret</label>
                        <button
                          type="button"
                          onClick={() => { setViewMode('RESET_PASSWORD'); setError(''); setSuccessMessage(''); setResetStep(1); }}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 transition"
                        >
                          Oublié ?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="••••"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-11 py-3.5 font-medium text-[15px] tracking-widest outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                    >
                      {loading ? <Loader2 className="animate-spin" size={17} /> : 'Se connecter'}
                    </button>

                    {config.enableFingerprint && (
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setSuccessMessage('');
                          setShowFingerprintModal(true);
                          setBiometricProgress(0);
                          setBiometricAlert("Veuillez poser votre doigt sur le capteur d'empreinte pour vous connecter.");
                          setBiometricScanning(false);
                        }}
                        className="w-full py-3.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-[20px] font-semibold hover:bg-gray-100 active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-2 outline-none cursor-pointer"
                        id="btn-fingerprint-login"
                      >
                        <Fingerprint size={16} className="text-green-600 animate-pulse" />
                        <span>Empreinte Digitale</span>
                      </button>
                    )}
                  </form>
                </div>

                <div className="pt-6 border-t border-gray-100 mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    Nouveau sur SERVI+ ?{' '}
                    <button
                      type="button"
                      onClick={() => { resetFormState(); setViewMode('ROLE_SELECTION'); }}
                      className="text-green-600 hover:underline font-bold"
                    >
                      Créer un compte
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ── 4. REGISTER (multi-étapes) ── */}
            {viewMode === 'REGISTER' && (
              <div className="flex-1 flex flex-col animate-fade-in">

                {/* ── Barre de navigation ── */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (registerStep === 1) { setViewMode('ROLE_SELECTION'); }
                      else { setRegisterStep(s => s - 1); setError(''); }
                    }}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition text-sm font-medium"
                  >
                    <ArrowLeft size={16} />
                    {registerStep === 1 ? 'Retour' : 'Précédent'}
                  </button>
                  <span className={cn(
                    "text-xs font-semibold px-3 py-1 rounded-full",
                    formData.role === UserRole.CLIENT
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  )}>
                    {formData.role === UserRole.CLIENT ? "Client" : "Prestataire"}
                  </span>
                </div>

                {/* ── Indicateur de progression ── */}
                <div className="flex items-center gap-1 mb-7">
                  {Array.from({ length: totalRegisterSteps }).map((_, i) => {
                    const step = i + 1;
                    const done = step < registerStep;
                    const active = step === registerStep;
                    return (
                      <React.Fragment key={step}>
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                          done ? "bg-green-600 text-white" :
                          active ? "bg-green-600 text-white ring-4 ring-green-100" :
                          "bg-gray-100 text-gray-400"
                        )}>
                          {done ? <Check size={13} /> : step}
                        </div>
                        {i < totalRegisterSteps - 1 && (
                          <div className={cn("flex-1 h-0.5 rounded-full transition-all", done ? "bg-green-500" : "bg-gray-200")} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* ── Erreur globale ── */}
                {error && (
                  <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-200 mb-5 flex items-start gap-2.5">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ══════════════════════════════════════
                    ÉTAPE 1 — Informations personnelles
                ══════════════════════════════════════ */}
                {registerStep === 1 && (
                  <div className="flex-1 flex flex-col justify-between animate-fade-in">
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Votre profil</h3>
                        <p className="text-gray-500 text-sm mt-1">Commençons par vos informations de base.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Nom complet</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input type="text" name="name" placeholder="Ex: Kouassi Amani"
                            value={formData.name} onChange={handleChange}
                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Téléphone</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input type="tel" name="phone" placeholder="Ex: 0703456789"
                            value={formData.phone} onChange={handleChange}
                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Ville</label>
                        <div className="relative">
                          <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <select name="city" value={formData.city} onChange={handleChange}
                            className="w-full bg-white border border-gray-200 text-gray-700 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all appearance-none cursor-pointer"
                          >
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button type="button" onClick={handleNextRegisterStep}
                      className="w-full mt-8 bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                      Suivant <ChevronRight size={17} />
                    </button>
                  </div>
                )}

                {/* ══════════════════════════════════════
                    ÉTAPE 2 — Code secret
                ══════════════════════════════════════ */}
                {registerStep === 2 && (
                  <div className="flex-1 flex flex-col justify-between animate-fade-in">
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Code secret</h3>
                        <p className="text-gray-500 text-sm mt-1">Choisissez un code à 4 chiffres pour sécuriser votre compte.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Votre code à 4 chiffres</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input type={showPassword ? "text" : "password"} name="password" placeholder="••••"
                            value={formData.password} onChange={handleChange}
                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-11 py-3.5 font-medium text-[15px] tracking-[0.3em] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                            inputMode="numeric" maxLength={4}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Confirmer le code</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input type={showPassword ? "text" : "password"} placeholder="••••"
                            value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] tracking-[0.3em] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                            inputMode="numeric" maxLength={4}
                          />
                        </div>
                      </div>

                      {/* Indicateur de correspondance */}
                      {formData.password && confirmPassword && (
                        <div className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold",
                          formData.password === confirmPassword
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                        )}>
                          {formData.password === confirmPassword
                            ? <><CheckCircle size={14} /> Codes identiques — parfait !</>
                            : <><AlertCircle size={14} /> Les codes ne correspondent pas</>
                          }
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={handleNextRegisterStep}
                      className="w-full mt-8 bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                      Suivant <ChevronRight size={17} />
                    </button>
                  </div>
                )}

                {/* ══════════════════════════════════════
                    ÉTAPE 3 (PROVIDER ONLY) — Services
                ══════════════════════════════════════ */}
                {registerStep === 3 && formData.role === UserRole.PROVIDER && (
                  <div className="flex-1 flex flex-col justify-between animate-fade-in">
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Vos services</h3>
                        <p className="text-gray-500 text-sm mt-1">Sélectionnez les services que vous proposez à vos clients.</p>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {Object.values(ServiceCategory).filter(s => s !== ServiceCategory.MARKET).map(s => {
                          const active = selectedServices.includes(s);
                          return (
                            <button key={s} type="button" onClick={() => toggleService(s)}
                              className={cn(
                                "px-4 py-2.5 rounded-[12px] text-sm font-semibold border transition-all",
                                active
                                  ? "bg-green-600 text-white border-green-600 shadow-[0_2px_10px_rgba(22,163,74,0.25)]"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50"
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>

                      {selectedServices.length > 0 && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                          <CheckCircle size={14} className="text-green-600 shrink-0" />
                          <span className="text-xs text-green-700 font-medium">
                            {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} sélectionné{selectedServices.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={handleNextRegisterStep}
                      className="w-full mt-8 bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                      Suivant <ChevronRight size={17} />
                    </button>
                  </div>
                )}

                {/* ══════════════════════════════════════
                    DERNIÈRE ÉTAPE — Identité + Finalisation
                    (Étape 3 pour CLIENT, Étape 4 pour PROVIDER)
                ══════════════════════════════════════ */}
                {registerStep === totalRegisterSteps && (
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between animate-fade-in overflow-y-auto no-scrollbar">
                    <div className="space-y-5 pb-2">
                      <div>
                        <h3 className="text-[22px] font-bold text-gray-900 tracking-tight">Vérification d'identité</h3>
                        <p className="text-gray-500 text-sm mt-1">Dernière étape — vos documents pour sécuriser votre compte.</p>
                      </div>

                      {/* Photo de profil */}
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Photo de profil <span className="text-red-400">*</span></label>
                        <div className="relative flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-[14px] p-4 cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition-all">
                          <div className={cn(
                            "w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-2 transition-all",
                            avatarPreview ? "border-green-500" : "border-gray-300 bg-gray-100"
                          )}>
                            {avatarPreview
                              ? <img src={avatarPreview} className="w-full h-full object-cover" alt="Profile" />
                              : <Camera className="text-gray-400" size={22} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-700">{avatarPreview ? "Photo ajoutée ✓" : "Appuyer pour ajouter"}</p>
                            <p className="text-xs text-gray-400 mt-0.5">JPG ou PNG · Votre vraie photo</p>
                          </div>
                          <input type="file" onChange={(e) => handleFileChange(e, 'avatar')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        </div>
                      </div>

                      {/* CNI */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700">
                          <span className="flex items-center gap-1.5">
                            <CreditCard size={14} className="text-green-600" />
                            Numéro CNI / Passeport <span className="text-red-400">*</span>
                          </span>
                        </label>
                        <input type="text" name="idNumber" placeholder="Ex: C 0023418"
                          value={formData.idNumber} onChange={handleChange}
                          className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] px-4 py-3.5 font-medium text-[15px] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                          required
                        />
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { file: idCardRectoFile, label: "Photo Recto", type: 'recto' as const },
                            { file: idCardVersoFile, label: "Photo Verso", type: 'verso' as const }
                          ].map(({ file, label, type }) => (
                            <div key={type} className={cn(
                              "relative h-20 border-2 border-dashed rounded-[12px] flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all",
                              file ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-400 hover:border-green-400 hover:bg-green-50/40"
                            )}>
                              <Camera size={18} />
                              <span className="text-xs font-semibold">{file ? `${label.split(' ')[1]} ✓` : label}</span>
                              <input type="file" onChange={(e) => handleFileChange(e, type)} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" required />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Politique de confidentialité */}
                      <label htmlFor="accept-privacy" className="flex items-start gap-3 cursor-pointer p-4 rounded-[14px] bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                        <input type="checkbox" id="accept-privacy" checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer shrink-0"
                        />
                        <span className="text-xs text-gray-600 leading-relaxed select-none">
                          J'accepte la{' '}
                          <button type="button" onClick={() => setShowPrivacyPolicy(true)}
                            className="text-green-600 underline font-semibold">
                            Politique de confidentialité
                          </button>{' '}
                          de Servi+. <span className="text-red-400">*</span>
                        </span>
                      </label>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full mt-4 bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer">
                      {loading ? <Loader2 className="animate-spin" size={17} /> : "Créer mon compte"}
                    </button>
                  </form>
                )}

              </div>
            )}

            {/* ── 5. RESET PASSWORD ── */}
            {viewMode === 'RESET_PASSWORD' && (
              <div className="flex-1 flex flex-col justify-between animate-fade-in">
                <div>
                  <button
                    type="button"
                    onClick={() => { setViewMode('LOGIN'); setError(''); setSuccessMessage(''); setResetStep(1); }}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition text-sm font-medium mb-8"
                  >
                    <ArrowLeft size={16} /> Retour
                  </button>

                  {/* Indicateur d'étape */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", resetStep === 1 ? "bg-green-600 text-white" : "bg-green-100 text-green-600")}>1</div>
                    <div className={cn("flex-1 h-0.5 rounded-full", resetStep === 2 ? "bg-green-500" : "bg-gray-200")} />
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", resetStep === 2 ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400")}>2</div>
                  </div>

                  <h3 className="text-[24px] font-bold text-gray-900 tracking-tight mb-1">
                    {resetStep === 1 ? "Code secret oublié" : "Nouveau code secret"}
                  </h3>
                  <p className="text-gray-500 text-sm mb-7">
                    {resetStep === 1
                      ? "Entrez votre numéro pour vérifier votre compte."
                      : "Créez un nouveau code à 4 chiffres pour votre compte."}
                  </p>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-semibold border border-red-200 mb-5 flex items-start gap-2.5">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleResetSubmit} className="space-y-5">
                    {resetStep === 1 ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700">Numéro de téléphone</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type="tel"
                              placeholder="Ex : 0103030334"
                              value={resetPhone}
                              onChange={(e) => { setResetPhone(e.target.value); setError(''); }}
                              className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? <Loader2 className="animate-spin" size={17} /> : "Vérifier mon numéro"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 p-3.5 rounded-[12px]">
                          <CheckCircle size={16} className="text-green-600 shrink-0" />
                          <span className="text-xs text-green-700 font-medium">Compte trouvé. Créez votre nouveau code ci-dessous.</span>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700">Nouveau code secret</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Ex : 5824"
                              value={resetNewPassword}
                              onChange={(e) => { setResetNewPassword(e.target.value); setError(''); }}
                              className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-11 py-3.5 font-medium text-[15px] tracking-widest outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                              required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700">Confirmer le code</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Répéter le code secret"
                              value={resetConfirmPassword}
                              onChange={(e) => { setResetConfirmPassword(e.target.value); setError(''); }}
                              className="w-full bg-white border border-gray-200 text-gray-900 rounded-[12px] pl-11 pr-4 py-3.5 font-medium text-[15px] tracking-widest outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-green-600 text-white rounded-[12px] py-4 font-semibold text-[15px] shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-[0.97] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? <Loader2 className="animate-spin" size={17} /> : "Confirmer le nouveau code"}
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* Demo credentials box — LOGIN only */}
            {viewMode === 'LOGIN' && (
              <div className="mt-5 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl animate-fade-in">
                <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Shield size={10} className="text-green-500" /> Comptes tests rapides (Démos)
                </h4>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, phone: '0103030334', password: '1234' })}
                    className="p-1.5 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-left transition-colors cursor-pointer"
                  >
                    <p className="text-[6.5px] font-bold text-gray-400 uppercase">CLIENT</p>
                    <p className="text-[9.5px] font-black text-gray-700">0103030334</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, phone: '0554199359', password: '1234' })}
                    className="p-1.5 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-left transition-colors cursor-pointer"
                  >
                    <p className="text-[6.5px] font-bold text-gray-400 uppercase">PRESTA</p>
                    <p className="text-[9.5px] font-black text-amber-600">0554199359</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, phone: '0749793516', password: '1234' })}
                    className="p-1.5 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-left transition-colors cursor-pointer"
                  >
                    <p className="text-[6.5px] font-bold text-gray-400 uppercase">ADMIN</p>
                    <p className="text-[9.5px] font-black text-green-600">0749793516</p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom home indicator — hidden on WELCOME */}
          {viewMode !== 'WELCOME' && (
            <div className="w-full flex justify-center pb-2 select-none pointer-events-none">
              <div className="w-36 h-1 bg-gray-200 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: PRIVACY POLICY ── */}
      {showPrivacyPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-100 text-gray-700 rounded-[28px] max-w-lg w-full max-h-[85vh] flex flex-col justify-between shadow-2xl p-6 sm:p-8">

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4 shrink-0">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-2xl">
                <ShieldCheck size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-base font-black text-gray-900 tracking-tight">Politique de Confidentialité</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Loi N° 2013-450 — Côte d'Ivoire</p>
              </div>
            </div>

            {/* Scrollable legal content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-gray-600 text-xs leading-relaxed max-h-[50vh] text-left">
              <p className="text-[10px] text-gray-400 italic font-medium">
                Dernière mise à jour : 9 juin 2026
              </p>

              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">1. Préambule et Cadre Légal</h4>
                <p>
                  La plateforme <strong className="text-green-600">Servi+</strong> s'engage à protéger la vie privée des utilisateurs (clients et prestataires de services à domicile) en Côte d'Ivoire. Cette politique est élaborée en conformité directe avec la <strong className="text-green-600">Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel</strong>, régulée par l'ARTCI (Autorité de Régulation des Télécommunications de Côte d'Ivoire).
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">2. Données Collectées</h4>
                <p>
                  Afin d'assurer des connexions sûres et d'éviter les fraudes ou incidents à domicile à Abidjan et à l'intérieur du pays, nous collectons les informations suivantes lors de votre inscription :
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-500 text-xs">
                  <li><strong className="text-gray-700">Identité Civile :</strong> Votre Nom complet et une photo de profil réelle et claire (Strictement obligatoire).</li>
                  <li><strong className="text-gray-700">Contact Téléphonique :</strong> Numéro de téléphone fonctionnel en Côte d'Ivoire (Orange, MTN, Moov). La connexion se fait exclusivement par code secret sécurisé, supprimant les contraintes d'attente d'OTP SMS.</li>
                  <li><strong className="text-gray-700">Localisation d'Intervention :</strong> Ville d'intervention et commune de résidence sélectionnée de manière à faciliter le matching local.</li>
                  <li><strong className="text-gray-700">Preuve administrative CNI (Obligatoire) :</strong> Le numéro de votre pièce d'identité (CNI, Passeport ou Carte Consulaire) ainsi que les prises de photo Recto et Verso claires de la pièce. Ces informations critiques sont utilisées par nos équipes de modération pour attribuer les badges de certification de profils et ne seront jamais exposées publiquement ou revendues.</li>
                </ul>
              </div>

              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">3. Utilisation & Confidentialité des Données</h4>
                <p>
                  Vos données de profil sont exploitées de la manière suivante :
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-500 text-xs">
                  <li>Elles permettent aux clients de consulter, présélectionner et contacter des prestataires de confiance à tout moment.</li>
                  <li>Elles fiabilisent l'écosystème en filtrant les faux profils grâce à la vérification approfondie des pièces d'identité effectuées manuellement par l'administration Servi+.</li>
                </ul>
                <p className="mt-1">
                  Servi+ est une plateforme de mise en relation directe avec <strong className="text-green-600">0% de commission</strong>. Nous ne vendons, louons ni ne commercialisons vos données à des fins publicitaires tierces. Les coordonnées ne sont fournies qu'entre les parties dans le cadre exclusif de la réalisation des travaux ménagers ou domestiques demandés.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">4. Sécurité de l'Hébergement</h4>
                <p>
                  Toutes vos données (notamment les images de profil et de CNI) sont hébergées sur des bases de données hautement protégées et chiffrées de bout en bout contre tout accès non autorisé. Seuls nos Super-Administrateurs habilités ont un droit de regard sur ces images lors de l'examen de vérification de conformité réglementaire.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">5. Vos Droits sous l'égide de l'ARTCI</h4>
                <p>
                  Conformément au Chapitre IV de la loi ivoirienne n° 2013-450, vous disposez d'un droit permanent d'accès, de mise à jour, d'opposition et de suppression totale de vos informations personnelles. Pour exercer ce droit ou retirer votre consentement d'accès, vous pouvez nous écrire directement de manière officielle par email à l'adresse support : <a href="mailto:contact@serviplus.ci" className="underline text-green-600 hover:text-green-700 font-bold">contact@serviplus.ci</a>.
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <h4 className="font-extrabold text-gray-900 text-[11px] uppercase tracking-wider">6. Consentement Obligatoire</h4>
                <p>
                  En validant votre inscription et en cochant la case d'acceptation, vous accordez de plein gré votre consentement libre, spécifique et éclairé pour le traitement et la préservation de vos informations décrites dans cette charte par Servi+.
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 pt-5 mt-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowPrivacyPolicy(false);
                }}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider text-white bg-green-600 hover:bg-green-700 rounded-[20px] shadow-[0_4px_20px_rgba(22,163,74,0.25)] active:scale-[0.97] transition-all text-center cursor-pointer"
              >
                Accepter et Valider
              </button>
              <button
                type="button"
                onClick={() => setShowPrivacyPolicy(false)}
                className="py-3 px-5 text-xs font-bold uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-[20px] active:scale-[0.97] transition-all text-center cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: FINGERPRINT ── */}
      {showFingerprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-gray-100 rounded-[28px] p-8 text-center space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowFingerprintModal(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-700 transition"
            >
              ✕
            </button>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900">Authentification Biométrique</h3>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Technologie Fingerprint</p>
            </div>

            {/* Fingerprint pulse circle */}
            <div className="flex flex-col items-center justify-center py-6">
              <button
                onClick={handleStartBiometricScan}
                disabled={biometricScanning}
                className={cn(
                  "w-28 h-28 rounded-full flex items-center justify-center border-4 relative transition-all duration-300",
                  biometricScanning
                    ? "border-green-500 bg-green-50 shadow-lg shadow-green-500/20"
                    : "border-gray-200 bg-gray-50 hover:border-green-400 hover:bg-green-50"
                )}
              >
                {biometricScanning && (
                  <div
                    className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-60"
                    style={{ animationDuration: '1.5s' }}
                  />
                )}
                <Fingerprint size={48} className={cn(
                  "transition-colors duration-300",
                  biometricScanning ? "text-green-600 animate-pulse" : "text-gray-400"
                )} />
              </button>

              {biometricScanning && (
                <div className="w-full max-w-xs mt-6 space-y-1.5">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-150"
                      style={{ width: `${biometricProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 text-right">{biometricProgress}% numérisé</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                {biometricAlert}
              </p>
            </div>

            {!biometricScanning ? (
              <button
                onClick={handleStartBiometricScan}
                className="w-full py-4 rounded-[20px] font-black text-xs uppercase tracking-wider text-white bg-green-600 hover:bg-green-700 shadow-[0_4px_20px_rgba(22,163,74,0.25)] active:scale-[0.97] transition-all cursor-pointer border-none"
              >
                Démarrer la Numérisation
              </button>
            ) : (
              <button
                onClick={() => setBiometricScanning(false)}
                className="w-full py-4 rounded-[20px] font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.97] transition-all cursor-pointer border-none"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: 2FA ── */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-gray-100 rounded-[28px] p-8 text-center space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShow2FAModal(false)}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-700 transition"
            >
              ✕
            </button>

            <div className="flex items-center justify-center gap-3">
              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-amber-500">
                <Smartphone size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-gray-900">Double Facteur (2FA)</h3>
                <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">Vérification de sécurité</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Afin de sécuriser votre compte, un code temporaire d'accès Servi+ a été simulé par SMS au <strong className="text-gray-900">+225 {otpSentPhone}</strong>.
            </p>

            {/* Demo callout */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-left">
              <p className="text-[10px] uppercase font-black text-amber-600 mb-0.5 tracking-wider">🔒 CODE DE SÉCURITÉ À ENTRER (DÉMO) :</p>
              <p className="text-xl font-black text-amber-700 tracking-widest font-mono text-center select-all bg-white p-2.5 rounded-xl border border-gray-100">{generatedOtp}</p>
              <p className="text-[9px] text-gray-500 font-semibold leading-relaxed mt-1.5">Saisissez ce code à 4 chiffres ci-dessous pour valider l'action de {typeOf2FA === 'LOGIN' ? 'connexion' : 'création de compte'}.</p>
            </div>

            <div className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Saisir le code d'accès à 4 chiffres</label>
                <input
                  type="tel"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Ex: 1234"
                  value={typedOtp}
                  onChange={(e) => setTypedOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-4 font-black font-mono tracking-widest text-xl outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all placeholder:text-gray-300"
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="w-1/3 py-4 rounded-[20px] font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[0.97] transition-all cursor-pointer border-none"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={handleVerify2FA}
                  className="w-2/3 py-4 rounded-[20px] font-black text-xs uppercase tracking-wider text-white bg-green-600 hover:bg-green-700 shadow-[0_4px_20px_rgba(22,163,74,0.25)] active:scale-[0.97] transition-all cursor-pointer border-none"
                >
                  Confirmer le Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
