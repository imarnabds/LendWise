import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { apiGetBorrowerHistory } from '../../api';
import styles from './BorrowerHistory.module.css';

interface HistoryItem {
    id: string;
    name: string;
    principalAmount: number;
    interestRate: number;
    durationMonths: number;
    startDate: string;
    deletedAt: string | null;
}

export const BorrowerHistory: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        apiGetBorrowerHistory()
            .then(data => setHistory(data.history || []))
            .catch(() => { });
    }, []);

    const filtered = history.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>Borrower's History</h2>
            <p className={styles.subtitle}>Last 10 borrowers removed from Active Loans</p>

            <div className={styles.toolbar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by Borrower Name..."
                        className={styles.searchInput}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Borrower Name</th>
                            <th className={styles.centerCell}>Principal Amount</th>
                            <th className={styles.centerCell}>Interest Rate</th>
                            <th className={styles.centerCell}>Duration</th>
                            <th className={styles.centerCell}>Start Date</th>
                            <th className={styles.centerCell}>Removed On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? (
                            filtered.map(item => (
                                <tr key={item.id}>
                                    <td className={styles.nameCell}>{item.name}</td>
                                    <td className={styles.centerCell}>₹{item.principalAmount.toLocaleString()}</td>
                                    <td className={styles.centerCell}>{item.interestRate}%</td>
                                    <td className={styles.centerCell}>{item.durationMonths} months</td>
                                    <td className={styles.centerCell}>{item.startDate}</td>
                                    <td className={styles.centerCell}>{item.deletedAt || '—'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className={styles.emptyState}>
                                    No borrower history found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
