import React from 'react';
import {
  Users,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Building2,
  CalendarDays,
  Key,
  BarChart3,
  MapPin
} from 'lucide-react';
import { Contact } from '../types';
import { useRealEstateStore } from '../stores/useRealEstateStore';
import { useScheduleStore } from '../stores/useScheduleStore';
import { Property } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DashboardProps {
  contacts: Contact[];
}

export const Dashboard: React.FC<DashboardProps> = ({ contacts }) => {
  const { properties } = useRealEstateStore();
  const { meetings } = useScheduleStore();

  // Dados para o gráfico de evolução de leads (exemplo simulado baseado em datas reais dos contatos se existissem)
  const leadData = [
    { name: 'Seg', leads: 4, value: 400 },
    { name: 'Ter', leads: 3, value: 300 },
    { name: 'Qua', leads: 8, value: 200 },
    { name: 'Qui', leads: 6, value: 278 },
    { name: 'Sex', leads: 12, value: 189 },
    { name: 'Sáb', leads: 9, value: 239 },
    { name: 'Dom', leads: 5, value: 349 },
  ];

  const activeContacts = contacts.filter(c => c.pipelineStage !== 'lost');

  // Imóveis Stats
  const availableProperties = properties.filter(p => p.status === 'available').length;
  const totalPropertiesValue = properties.reduce((acc, p) => acc + p.price, 0);

  // Pipeline Stats
  const pipelineValue = contacts.reduce((acc, c) => acc + (c.dealValue || 0), 0);

  // Agendamentos
  const scheduledVisits = meetings.filter(m => m.type === 'visit' && m.status === 'scheduled').length;
  const visitsThisWeek = meetings.filter(m => {
    const meetingDate = new Date(m.date);
    const now = new Date();
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return m.type === 'visit' && meetingDate >= now && meetingDate <= oneWeek;
  }).length;

  const stats = [
    {
      label: 'Valor em Pipeline',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(pipelineValue),
      icon: DollarSign,
      color: 'bg-green-500',
      change: '+12% este mês'
    },
    {
      label: 'Imóveis Disponíveis',
      value: availableProperties.toString(),
      icon: Building2,
      color: 'bg-blue-500',
      change: `${properties.length} total`
    },
    {
      label: 'Visitas Agendadas',
      value: scheduledVisits.toString(),
      icon: Key,
      color: 'bg-indigo-500',
      change: `${visitsThisWeek} esta semana`
    },
    {
      label: 'Leads Ativos',
      value: activeContacts.length.toString(),
      icon: Users,
      color: 'bg-purple-500',
      change: '+5 novos hoje'
    }
  ];

  // Dados para gráficos
  const propertiesByType = [
    { name: 'Apartamentos', value: properties.filter(p => p.type === 'apartment').length },
    { name: 'Casas', value: properties.filter(p => p.type === 'house').length },
    { name: 'Terrenos', value: properties.filter(p => p.type === 'land').length },
    { name: 'Comercial', value: properties.filter(p => p.type === 'commercial').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] p-8 transition-colors duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Dashboard Imobiliário</h1>
        <p className="text-[var(--text-muted)]">Visão geral da sua performance de vendas e locação.</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-main)] shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-${stat.color.replace('bg-', '')}`}>
                  <Icon size={24} className={stat.color.replace('bg-', 'text-')} />
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
              </div>
              <h3 className="text-3xl font-bold text-[var(--text-main)] mb-1">{stat.value}</h3>
              <p className="text-sm text-[var(--text-muted)] font-medium">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Evolução de Leads */}
        <div className="bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-main)] shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" />
            Evolução Semanal de Leads
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leadData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--accent-main)' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#22c55e" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Distribuição de Imóveis */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Building2 size={20} className="text-blue-500" />
            Distribuição do Portfólio
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertiesByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {propertiesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Próximas Visitas */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <CalendarDays size={20} className="text-indigo-500" />
            Próximas Visitas
          </h3>
          <div className="space-y-4">
            {meetings
              .filter(m => m.type === 'visit' && m.status === 'scheduled')
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 4)
              .map(meeting => {
                const contact = contacts.find(c => c.id === meeting.contactId);
                const property = properties.find(p => p.id === meeting.propertyId);
                const date = new Date(meeting.date);

                return (
                  <div key={meeting.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex-col items-center justify-center text-center min-w-[50px] bg-indigo-50 rounded-lg p-2 hidden sm:flex">
                      <span className="text-xs font-bold text-indigo-400 uppercase">{date.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      <span className="text-lg font-bold text-indigo-600">{date.getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800">{contact?.name || 'Cliente'}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={12} />
                        {property ? property.title : 'Imóvel a definir'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-700">{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Confirmado</span>
                    </div>
                  </div>
                );
              })}

            {meetings.filter(m => m.type === 'visit' && m.status === 'scheduled').length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <CalendarDays size={48} className="mx-auto mb-2 opacity-20" />
                <p>Nenhuma visita agendada.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
