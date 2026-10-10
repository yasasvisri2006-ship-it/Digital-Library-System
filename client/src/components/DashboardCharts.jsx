import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const categories = [
  { name: 'Computer Science', value: 36, color: '#3568e8' },
  { name: 'Literature', value: 24, color: '#7c6ce8' },
  { name: 'Science', value: 18, color: '#29b7a4' },
  { name: 'Business', value: 13, color: '#f2aa45' },
  { name: 'Other', value: 9, color: '#dce5f5' },
];

const circulation = [
  { month: 'May', issued: 720, returned: 610 },
  { month: 'Jun', issued: 850, returned: 740 },
  { month: 'Jul', issued: 780, returned: 690 },
  { month: 'Aug', issued: 980, returned: 790 },
  { month: 'Sep', issued: 890, returned: 820 },
  { month: 'Oct', issued: 1120, returned: 930 },
  { month: 'Nov', issued: 1040, returned: 950 },
  { month: 'Dec', issued: 1270, returned: 1080 },
  { month: 'Jan', issued: 1180, returned: 1020 },
  { month: 'Feb', issued: 1390, returned: 1210 },
  { month: 'Mar', issued: 1290, returned: 1140 },
  { month: 'Apr', issued: 1510, returned: 1320 },
];

export function CirculationChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={circulation} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="issuedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f72ed" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#3f72ed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="returnedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#36bca8" stopOpacity={0.16} />
            <stop offset="95%" stopColor="#36bca8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#edf1f7" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8995a9', fontSize: 11 }} dy={10} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8995a9', fontSize: 11 }} />
        <Tooltip contentStyle={{ border: '1px solid #e8edf5', borderRadius: 12, boxShadow: '0 12px 30px rgba(20, 40, 80, .1)' }} />
        <Area type="monotone" dataKey="issued" name="Checkouts" stroke="#3f72ed" strokeWidth={2.5} fill="url(#issuedFill)" />
        <Area type="monotone" dataKey="returned" name="Returns" stroke="#36bca8" strokeWidth={2.2} fill="url(#returnedFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={categories} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="94%" paddingAngle={3} stroke="none">
          {categories.map((item) => <Cell key={item.name} fill={item.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function DashboardCharts({ type }) {
  return type === 'category' ? <CategoryChart /> : <CirculationChart />;
}
