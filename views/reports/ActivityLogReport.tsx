// src/views/reports/ActivityLogReport.tsx
import React, { useState, useEffect } from 'react';
import { SystemLog } from '../../types';
// [ULTRAMAX DEVS] 1. Import 'db' เพื่อเชื่อมต่อกับฐานข้อมูล IndexedDB โดยตรง


import { db } from '../../lib/posDB';


// [ULTRAMAX DEVS] 2. Component นี้ไม่จำเป็นต้องรับ props 'log' อีกต่อไป
const ActivityLogReport: React.FC = () => {
    // [ULTRAMAX DEVS] 3. สร้าง State ภายในเพื่อจัดการข้อมูล Log และสถานะการโหลด
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    // [ULTRAMAX DEVS] 4. ใช้ useEffect เพื่อดึงข้อมูลล่าสุดทุกครั้งที่หน้านี้ถูกเปิด
    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                // ดึงข้อมูลทั้งหมดจากตาราง 'systemLogs' และเรียงลำดับจากใหม่ไปเก่า
                const allLogs = await db.systemLogs.orderBy('timestamp').reverse().toArray();
                setLogs(allLogs);
            } catch (error) {
                console.error("UltraMax Devs Log: Failed to fetch system logs:", error);
            } finally {
                setIsLoading(false);
            }
        };


        fetchLogs();
    }, []); // ทำงานเพียงครั้งเดียวเมื่อ Component ถูกสร้างขึ้น


    // [ULTRAMAX DEVS] 5. แสดงสถานะการโหลดเพื่อประสบการณ์ผู้ใช้ที่ดีขึ้น
    if (isLoading) {
        return (
             <div>
                <div className="report-header"><h1>ประวัติการทำงาน</h1></div>
                <p style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }


    return (
        <div>
            <div className="report-header"><h1>ประวัติการทำงาน</h1></div>
            <table className="report-table">
                {/* [ULTRAMAX DEVS] 6. เพิ่มคอลัมน์ Type และ Level เพื่อข้อมูลที่สมบูรณ์ขึ้น */}
                <thead><tr><th>เวลา</th><th>การดำเนินการ</th><th>ประเภท</th><th>ระดับ</th></tr></thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีข้อมูลการทำงาน</td></tr>
                    ) : (
                        logs.map((entry) => (
                            <tr key={entry.id}>
                                <td>{new Date(entry.timestamp).toLocaleString('th-TH')}</td>
                                <td>{entry.message}</td>
                                <td>{entry.type}</td>
                                <td><span className={`log-level-badge level-${entry.level.toLowerCase()}`}>{entry.level}</span></td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};


export default ActivityLogReport;