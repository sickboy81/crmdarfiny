import React, { useState } from 'react';
import { Property } from '../../types';
import { X, Upload, Home, MapPin, Plus, Trash2 } from 'lucide-react';

interface PropertyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (property: Property) => void;
    initialData?: Property | null;
}

const emptyProperty = (): Omit<Property, 'id'> => ({
    code: '',
    title: '',
    description: '',
    type: 'apartment',
    status: 'available',
    price: 0,
    address: '',
    neighborhood: '',
    city: '',
    features: [],
    specs: {
        area: 0,
        bedrooms: 0,
        bathrooms: 0,
        parking: 0,
    },
    photos: [],
});

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
}) => {
    const [formData, setFormData] = useState<Omit<Property, 'id'>>(() => ({
        ...emptyProperty(),
        ...(initialData || {}),
    }));

    const [featuresInput, setFeaturesInput] = useState(
        initialData?.features.join(', ') || ''
    );

    const [photoInput, setPhotoInput] = useState('');
    const [cep, setCep] = useState('');
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleSave = () => {
        const features = featuresInput.split(',').map((f) => f.trim()).filter(Boolean);
        const photos = formData.photos || [];

        onSave({
            id: initialData?.id || `prop-${Date.now()}`,
            ...formData,
            features,
            photos,
        } as Property);
        onClose();
    };

    const handleChange = (field: keyof Omit<Property, 'id' | 'specs'>, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSpecChange = (field: keyof Property['specs'], value: number) => {
        setFormData((prev) => ({
            ...prev,
            specs: { ...prev.specs, [field]: value },
        }));
    };

    const handleCepLookup = async (value: string) => {
        const cleanedCep = value.replace(/\D/g, '');
        setCep(value); // Keep formatting in input

        if (cleanedCep.length === 8) {
            setIsLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
                const data = await response.json();

                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: `${data.logradouro}`,
                        neighborhood: data.bairro,
                        city: data.localidade,
                    }));
                }
            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            } finally {
                setIsLoadingCep(false);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    photos: [...(prev.photos || []), reader.result as string]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Home className="text-blue-600" size={20} />
                        {initialData ? 'Editar Imóvel' : 'Novo Imóvel'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Informações Básicas</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Anúncio</label>
                                <input
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Ex: Apartamento de Luxo no Jardins"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código (Ref)</label>
                                <input
                                    value={formData.code}
                                    onChange={(e) => handleChange('code', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Ex: AP-1020"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => handleChange('price', Number(e.target.value))}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleChange('type', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="apartment">Apartamento</option>
                                    <option value="house">Casa</option>
                                    <option value="village_house">Casa de Vila</option>
                                    <option value="studio">Kitnet/Conjugado</option>
                                    <option value="land">Terreno</option>
                                    <option value="commercial">Comercial</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                >
                                    <option value="available">Disponível</option>
                                    <option value="reserved">Reservado</option>
                                    <option value="sold">Vendido</option>
                                    <option value="rented">Alugado</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                                placeholder="Descreva o imóvel..."
                            />
                        </div>
                    </section>

                    {/* Location */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <MapPin size={16} /> Localização
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                    CEP
                                    {isLoadingCep && <span className="text-xs text-blue-600 animate-pulse">Buscando...</span>}
                                </label>
                                <input
                                    value={cep}
                                    onChange={(e) => handleCepLookup(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                                    placeholder="00000-000"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                <input
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                                    placeholder="Ex: Rua Oscar Freire, 1234"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                                <input
                                    value={formData.neighborhood}
                                    onChange={(e) => handleChange('neighborhood', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                                    placeholder="Bairro"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                                <input
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                                    placeholder="Cidade"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Specs */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Características</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 text-center font-bold uppercase">Área (m²)</label>
                                <input
                                    type="number"
                                    value={formData.specs.area}
                                    onChange={(e) => handleSpecChange('area', Number(e.target.value))}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 text-center font-bold uppercase">Quartos</label>
                                <input
                                    type="number"
                                    value={formData.specs.bedrooms}
                                    onChange={(e) => handleSpecChange('bedrooms', Number(e.target.value))}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 text-center font-bold uppercase">Banheiros</label>
                                <input
                                    type="number"
                                    value={formData.specs.bathrooms}
                                    onChange={(e) => handleSpecChange('bathrooms', Number(e.target.value))}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1 text-center font-bold uppercase">Vagas</label>
                                <input
                                    type="number"
                                    value={formData.specs.parking}
                                    onChange={(e) => handleSpecChange('parking', Number(e.target.value))}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Diferenciais (separados por vírgula)</label>
                            <input
                                value={featuresInput}
                                onChange={(e) => setFeaturesInput(e.target.value)}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg"
                                placeholder="Piscina, Academia, Varanda Gourmet..."
                            />
                        </div>
                    </section>

                    {/* Photos */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Upload size={16} /> Fotos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Adicionar por URL</label>
                                <div className="flex gap-2">
                                    <input
                                        value={photoInput}
                                        onChange={(e) => setPhotoInput(e.target.value)}
                                        className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                                        placeholder="https://..."
                                    />
                                    <button
                                        type="button"
                                        className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors text-xs"
                                        onClick={() => {
                                            if (photoInput) {
                                                setFormData(prev => ({ ...prev, photos: [...(prev.photos || []), photoInput] }));
                                                setPhotoInput('');
                                            }
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">Upload Local</label>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-500 transition-all text-xs font-bold"
                                >
                                    <Plus size={14} /> Selecionar Arquivos
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        </div>

                        {/* Photo Preview */}
                        {formData.photos && formData.photos.length > 0 && (
                            <div className="grid grid-cols-4 gap-3 mt-4">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
                                        <img src={photo} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => setFormData(prev => ({ ...prev, photos: (prev.photos || []).filter((_, i) => i !== index) }))}
                                                className="bg-white p-2 rounded-full text-red-500 hover:scale-110 transition-transform shadow-lg"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-white transition-all shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!formData.title || !formData.price}
                        className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
                    >
                        {initialData ? 'Salvar Alterações' : 'Criar Imóvel'}
                    </button>
                </div>

            </div>
        </div>
    );
};
