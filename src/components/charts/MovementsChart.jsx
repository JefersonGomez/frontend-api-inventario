import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

export function MovementsChart({ data }) {
  const { t } = useTranslation();

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs text-muted-foreground" />
          <YAxis className="text-xs text-muted-foreground" />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px' }}
            itemStyle={{ color: 'var(--popover-foreground)' }}
          />
          <Legend />
          <Bar dataKey="in" name={t('movements.in')} fill="#8B7CF6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="out" name={t('movements.out')} fill="#F87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}