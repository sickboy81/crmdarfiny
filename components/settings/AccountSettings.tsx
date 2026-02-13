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
} from 'lucide-react';

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
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
    profile,
    setProfile,
    onSave,
}) => {
    const updateField = (field: keyof CompanyProfile, value: string) => {
        setProfile({ ...profile, [field]: value });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl">
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
