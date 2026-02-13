import React, { useState } from 'react';
import { Property } from '../../types';
import { Search, MapPin, Building2, Home, Map, X } from 'lucide-react';
import { useRealEstateStore } from '../../stores/useRealEstateStore';
import { PropertyCard } from './PropertyCard';

interface PropertyPickerProps {
    onSelect: (property: Property) => void;
    onClose: () => void;
}

export const PropertyPicker: React.FC<PropertyPickerProps> = ({ onSelect, onClose }) => {
    const { properties } = useRealEstateStore();
    const [filterType, setFilterType] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProperties = properties.filter(p => {
        const matchesType = filterType ? p.type === filterType : true;
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Selecionar Imóvel</h2>
                        <p className="text-sm text-gray-500">Envie a ficha completa para o cliente</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar imóvel..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        {[
                            { id: null, label: 'Todos', icon: null },
                            { id: 'apartment', label: 'Aptos', icon: Building2 },
                            { id: 'house', label: 'Casas', icon: Home },
                            { id: 'land', label: 'Terrenos', icon: Map },
                        ].map(type => (
                            <button
                                key={type.id || 'all'}
                                onClick={() => setFilterType(type.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${filterType === type.id
                                        ? 'bg-gray-800 text-white border-gray-800'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                                    }`}
                            >
                                {type.icon && <type.icon size={14} />}
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProperties.map(property => (
                            <div
                                key={property.id}
                                className="cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-md"
                                onClick={() => onSelect(property)}
                            >
                                <PropertyCard property={property} compact />
                            </div>
                        ))}
                    </div>

                    {filteredProperties.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <Search size={48} className="mb-2 opacity-20" />
                            <p>Nenhum imóvel encontrado.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
