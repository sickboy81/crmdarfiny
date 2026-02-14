import React from 'react';
import {
    Building2,
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    Globe,
    Save,
    Camera,
    Lock,
    Key,
    Loader2,
    ImageIcon
} from 'lucide-react';
import { UserProfile } from '../../hooks/useSettings';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export interface CompanyProfile {
    companyName: string;
    ownerName: string;
    cnpj: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    website: string;
    logo: string;
    creci: string;
}

interface AccountSettingsProps {
    profile: CompanyProfile;
    setProfile: (profile: CompanyProfile) => void;
    onSave: () => void;
    userProfile: UserProfile;
    setUserProfile: (profile: UserProfile) => void;
    onSaveUser: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
    profile,
    setProfile,
    onSave,
    userProfile,
    setUserProfile,
    onSaveUser,
}) => {
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const updateField = (field: keyof CompanyProfile, value: string) => {
        setProfile({ ...profile, [field]: value });
    };

    const updateUserField = (field: keyof UserProfile, value: string) => {
        setUserProfile({ ...userProfile, [field]: value });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione uma imagem');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('A imagem deve ter no máximo 2MB');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `profiles/${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            updateUserField('photoUrl', publicUrl);
            toast.success('Foto carregada com sucesso!');
        } catch (error: any) {
            console.error('Erro no upload:', error);
            toast.error('Falha ao subir imagem. Verifique se o bucket "avatars" existe no Supabase.');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPassword) {
            toast.error('Informe a nova senha');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast.success('Senha atualizada com sucesso!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Erro ao mudar senha:', error);
            toast.error(error.message || 'Erro ao atualizar senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl">
            {/* User Profile Info */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <User className="text-indigo-600" size={20} />
                    Perfil do Usuário
                </h3>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="relative group self-center md:self-start">
                        <div className="w-24 h-24 rounded-full border-4 border-indigo-50 overflow-hidden shadow-inner">
                            <img
                                src={userProfile.photoUrl}
                                alt="User Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all disabled:bg-gray-400"
                            title="Mudar foto"
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Foto de Perfil</label>
                            <div className="relative">
                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={userProfile.photoUrl}
                                    onChange={(e) => updateUserField('photoUrl', e.target.value)}
                                    placeholder="https://exemplo.com/foto.jpg"
                                    className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Exibição</label>
                            <input
                                type="text"
                                value={userProfile.name}
                                onChange={(e) => updateUserField('name', e.target.value)}
                                placeholder="Seu Nome"
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Função</label>
                            <input
                                type="text"
                                value={userProfile.role}
                                onChange={(e) => updateUserField('role', e.target.value)}
                                placeholder="Ex: Master Corretor"
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                onClick={onSaveUser}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <Save size={16} />
                                Atualizar Perfil
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Company Logo & Name Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-lg">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30">
                            {profile.logo ? (
                                <img src={profile.logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                            ) : (
                                <Building2 size={36} className="text-white/70" />
                            )}
                        </div>
                        <button
                            className="absolute -bottom-1 -right-1 p-1.5 bg-white text-blue-600 rounded-lg shadow-md hover:bg-blue-50 transition-colors"
                            title="Alterar logo"
                        >
                            <Camera size={14} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{profile.companyName || 'Sua Empresa'}</h2>
                        <p className="text-blue-100 text-sm mt-1">Configure as informações da sua empresa</p>
                    </div>
                </div>
            </div>

            {/* Company Info */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20} />
                    Dados da Empresa
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Building2 size={14} className="inline mr-1" /> Nome da Empresa
                        </label>
                        <input
                            type="text"
                            value={profile.companyName}
                            onChange={(e) => updateField('companyName', e.target.value)}
                            placeholder="Ex: Imobiliária Premium Ltda"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <User size={14} className="inline mr-1" /> Responsável
                        </label>
                        <input
                            type="text"
                            value={profile.ownerName}
                            onChange={(e) => updateField('ownerName', e.target.value)}
                            placeholder="Ex: João Silva"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FileText size={14} className="inline mr-1" /> CNPJ / CPF
                        </label>
                        <input
                            type="text"
                            value={profile.cnpj}
                            onChange={(e) => updateField('cnpj', e.target.value)}
                            placeholder="00.000.000/0000-00"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <FileText size={14} className="inline mr-1" /> CRECI
                        </label>
                        <input
                            type="text"
                            value={profile.creci}
                            onChange={(e) => updateField('creci', e.target.value)}
                            placeholder="Ex: 12345-J"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                        />
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Phone className="text-green-600" size={20} />
                    Informações de Contato
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Phone size={14} className="inline mr-1" /> Telefone
                        </label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                            placeholder="(11) 99999-9999"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Mail size={14} className="inline mr-1" /> E-mail
                        </label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            placeholder="contato@empresa.com"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Globe size={14} className="inline mr-1" /> Website
                        </label>
                        <input
                            type="url"
                            value={profile.website}
                            onChange={(e) => updateField('website', e.target.value)}
                            placeholder="https://www.empresa.com"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:outline-none text-gray-900"
                        />
                    </div>
                </div>
            </div>

            {/* Address */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="text-red-500" size={20} />
                    Endereço
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                        <input
                            type="text"
                            value={profile.address}
                            onChange={(e) => updateField('address', e.target.value)}
                            placeholder="Rua, Número, Bairro"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                        <input
                            type="text"
                            value={profile.city}
                            onChange={(e) => updateField('city', e.target.value)}
                            placeholder="Ex: São Paulo"
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select
                            value={profile.state}
                            onChange={(e) => updateField('state', e.target.value)}
                            className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:outline-none text-gray-900"
                            title="Selecionar estado"
                        >
                            <option value="">Selecione...</option>
                            {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                <option key={uf} value={uf}>{uf}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Lock className="text-purple-600" size={20} />
                    Segurança e Acesso
                </h3>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                    <p className="text-sm text-gray-500">Altere sua senha de acesso ao CRM.</p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nova Senha
                        </label>
                        <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={16} />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl pl-12 focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Nova Senha
                        </label>
                        <div className="relative group">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={16} />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a nova senha"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl pl-12 focus:ring-2 focus:ring-purple-500 focus:outline-none text-gray-900 text-sm"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-all w-full md:w-auto"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Atualizar Senha
                    </button>
                </form>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all hover:shadow-xl hover:shadow-blue-300"
                >
                    <Save size={18} />
                    Salvar Dados da Empresa
                </button>
            </div>
        </div>
    );
};
