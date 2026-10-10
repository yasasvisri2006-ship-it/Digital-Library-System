import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({ title, value, change, note, icon: Icon, tone = 'blue', delay = 0 }) {
  const isDown = change?.startsWith('-');

  return (
    <motion.article
      className="overview-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay }}
    >
      <div className="overview-card-top">
        <div className={`overview-icon ${tone}`}><Icon size={19} strokeWidth={1.8} /></div>
        <span className={`metric-change ${isDown ? 'down' : ''}`}>
          {isDown ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          {change}
        </span>
      </div>
      <p>{title}</p>
      <div className="overview-card-bottom">
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </motion.article>
  );
}
