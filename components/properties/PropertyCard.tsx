import React from 'react';
import { Property } from '../../types';
import { MapPin, Bed, Bath, Car, Maximize, ArrowRight, Trash2, Camera, Edit } from 'lucide-react';

interface PropertyCardProps {
    property: Property;
    onSend?: (property: Property) => void;
    onEdit?: (property: Property) => void;
    onDelete?: (property: Property) => void;
    compact?: boolean; // Para exibição dentro do chat
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
    property,
    onSend,
    onEdit,
    onDelete,
    compact = false
}) => {
    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
    };

    if (compact) {
        return (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm max-w-[280px]">
                <div className="relative h-32">
                    <img
                        src={property.photos[0] || 'https://via.placeholder.com/400'}
                        alt={property.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        {property.code}
                    </div>
                </div>
                <div className="p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{property.type === 'apartment' ? 'Apartamento' : 'Casa'} • {property.neighborhood}</p>
                    <h4 className="font-bold text-gray-800 text-sm mb-1 truncate">{property.title}</h4>
                    <p className="text-sm font-bold text-green-700 mb-2">{formatPrice(property.price)}</p>

                    <div className="flex justify-between text-gray-500 text-[10px] border-t border-gray-100 pt-2">
                        <span className="flex items-center gap-1"><Maximize size={10} /> {property.specs.area}m²</span>
                        <span className="flex items-center gap-1"><Bed size={10} /> {property.specs.bedrooms}</span>
                        <span className="flex items-center gap-1"><Car size={10} /> {property.specs.parking}</span>
                    </div>

                    <button
                        className="w-full mt-3 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold py-1.5 rounded transition-colors"
                        onClick={() => onSend?.(property)}
                    >
                        Ver Detalhes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-48 overflow-hidden bg-gray-100">
                <img
                    src={property.photos[0] || 'https://via.placeholder.com/400'}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-gray-900 text-xs font-bold px-2.5 py-1 rounded shadow-sm border border-gray-100">
                    {property.code}
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                    <div className={`text-xs font-bold px-2.5 py-1 rounded shadow-sm backdrop-blur-md ${property.status === 'available' ? 'bg-green-500/90 text-white' :
                        property.status === 'reserved' ? 'bg-yellow-500/90 text-white' :
                            'bg-red-500/90 text-white'
                        }`}>
                        {property.status === 'available' ? 'Disponível' :
                            property.status === 'reserved' ? 'Reservado' :
                                property.status === 'sold' ? 'Vendido' : 'Alugado'}
                    </div>
                </div>

                {property.photos.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Camera size={10} /> 1/{property.photos.length}
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        {property.type === 'apartment' ? 'Apartamento' :
                            property.type === 'house' ? 'Casa' :
                                property.type === 'village_house' ? 'Casa de Vila' :
                                    property.type === 'studio' ? 'Kitnet/Conjugado' :
                                        property.type === 'land' ? 'Terreno' : 'Comercial'}
                    </p>
                </div>

                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 line-clamp-2 min-h-[3.5rem]" title={property.title}>
                    {property.title}
                </h3>

                <div className="flex items-center gap-1 text-gray-500 text-xs mb-4">
                    <MapPin size={12} className="text-gray-400" />
                    <span className="truncate">{property.neighborhood}, {property.city}</span>
                </div>

                <div className="flex items-center gap-4 text-gray-600 text-xs mb-5 py-3 border-y border-gray-50">
                    <span className="flex items-center gap-1.5" title="Área"><Maximize size={14} className="text-blue-500" /> <span className="font-medium">{property.specs.area}m²</span></span>
                    <span className="flex items-center gap-1.5" title="Quartos"><Bed size={14} className="text-blue-500" /> <span className="font-medium">{property.specs.bedrooms}</span></span>
                    <span className="flex items-center gap-1.5" title="Banheiros"><Bath size={14} className="text-blue-500" /> <span className="font-medium">{property.specs.bathrooms}</span></span>
                    <span className="flex items-center gap-1.5" title="Vagas"><Car size={14} className="text-blue-500" /> <span className="font-medium">{property.specs.parking}</span></span>
                </div>

                <div className="mt-auto">
                    <p className="font-bold text-green-700 text-xl mb-4 tracking-tight">{formatPrice(property.price)}</p>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit?.(property)}
                            className="p-2 text-gray-500 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-gray-100"
                            title="Editar"
                        >
                            <Edit size={18} />
                        </button>
                        <button
                            onClick={() => onDelete?.(property)}
                            className="p-2 text-gray-500 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-gray-100"
                            title="Excluir"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button
                            onClick={() => onSend?.(property)}
                            className="flex-1 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm shadow-green-200"
                        >
                            Enviar <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
