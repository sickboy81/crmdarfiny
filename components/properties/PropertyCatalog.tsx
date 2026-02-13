import React, { useState } from 'react';
import { useRealEstateStore } from '../../stores/useRealEstateStore';
import { PropertyCard } from './PropertyCard';
import { PropertyFormModal } from './PropertyFormModal';
import { Plus, Search, Filter, Home, Building2, Map } from 'lucide-react';
import { Property } from '../../types';

export const PropertyCatalog: React.FC = () => {
    const { properties, addProperty, updateProperty, deleteProperty } = useRealEstateStore();
    const [filterType, setFilterType] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);

    const filteredProperties = properties.filter(p => {
        const matchesType = filterType ? p.type === filterType : true;
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleSaveProperty = (property: Property) => {
        if (editingProperty) {
            updateProperty(editingProperty.id, property);
        } else {
            addProperty(property);
        }
        setIsModalOpen(false);
        setEditingProperty(null);
    };

    const handleEdit = (property: Property) => {
        setEditingProperty(property);
        setIsModalOpen(true);
    };

    const handleNew = () => {
        setEditingProperty(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este imóvel?')) {
            deleteProperty(id);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f4f5f7]">
            {/* Header */}
            <div className="bg-white px-8 py-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Catálogo de Imóveis</h1>
                        <p className="text-gray-500">Gerencie e compartilhe seu portfólio imobiliário.</p>
                    </div>
                    <button
                        onClick={handleNew}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus size={20} />
                        Novo Imóvel
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por código, título ou bairro..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                        <button
                            onClick={() => setFilterType(null)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${!filterType ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterType('apartment')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-2 ${filterType === 'apartment' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <Building2 size={16} /> Apartamentos
                        </button>
                        <button
                            onClick={() => setFilterType('house')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-2 ${filterType === 'house' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <Home size={16} /> Casas
                        </button>
                        <button
                            onClick={() => setFilterType('land')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border flex items-center gap-2 ${filterType === 'land' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <Map size={16} /> Terrenos
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProperties.map(property => (
                        <PropertyCard
                            key={property.id}
                            property={property}
                            onSend={() => alert(`Implementar envio do imóvel ${property.code}`)}
                            onEdit={() => handleEdit(property)}
                            onDelete={() => handleDelete(property.id)}
                        />
                    ))}
                </div>
                {filteredProperties.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <Search size={32} />
                        </div>
                        <p className="text-lg font-medium">Nenhum imóvel encontrado</p>
                        <p className="text-sm">Tente ajustar os filtros ou sua busca</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <PropertyFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProperty}
                initialData={editingProperty}
            />
        </div>
    );
};
