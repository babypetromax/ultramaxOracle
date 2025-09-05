import React, { useRef, ChangeEvent } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useStore } from '../../contexts/store/index';
import { db } from '../../lib/posDB';
import { exportDB, importDB } from 'dexie-export-import';
import { Logger } from '../../services/loggingService';


export default function DataManagement() {
    const { showNotification } = useNotification();
    const showConfirmation = useConfirmation();
    const isAdminMode = useStore(state => state.isAdminMode);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        Logger.action('Export Database Initiated');
        try {
            const blob = await exportDB(db, { prettyJson: true });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ultramax-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showNotification('สำรองข้อมูลสำเร็จ!', 'success');
            Logger.info('SYSTEM', 'Database exported successfully');
        } catch (error) {
            showNotification('เกิดข้อผิดพลาดในการสำรองข้อมูล!', 'error');
            Logger.error('Database export failed', error);
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;


        const resetInput = () => {
            if (fileInputRef.current) fileInputRef.current.value = '';
        };


        const confirmed = await showConfirmation({
            title: 'คำเตือนร้ายแรง',
            message: 'การกระทำนี้จะเขียนทับข้อมูลทั้งหมดที่มีอยู่ด้วยข้อมูลจากไฟล์สำรอง และไม่สามารถย้อนกลับได้! คุณต้องการดำเนินการต่อใช่หรือไม่?',
            confirmText: 'ยืนยันและดำเนินการต่อ',
            danger: true,
        });


        if (!confirmed) {
            resetInput();
            return;
        }


        Logger.action('Import Database Initiated', { fileName: file.name });


        let inMemoryBackup: Blob | null = null;
        try {
            console.log("Creating in-memory backup before import...");
            inMemoryBackup = await exportDB(db);
            Logger.info('SYSTEM', 'In-memory backup created prior to import.');

            await importDB(file);


            showNotification('กู้คืนข้อมูลสำเร็จ! แอปพลิเคชันจะทำการรีเฟรช', 'success');
            setTimeout(() => window.location.reload(), 2000);


        } catch (error) {
            showNotification('การกู้คืนข้อมูลล้มเหลว! กำลังกู้คืนข้อมูลเดิม...', 'error');
            Logger.error('Database import failed', error);

            if (inMemoryBackup) {
                console.log("Restoring from in-memory backup due to import failure...");
                try {
                    await importDB(inMemoryBackup);
                    showNotification('ข้อมูลเดิมถูกกู้คืนเรียบร้อยแล้ว', 'info');
                    Logger.info('SYSTEM', 'Successfully restored database from in-memory backup.');
                } catch (restoreError) {
                    showNotification('ข้อผิดพลาดร้ายแรง: ไม่สามารถกู้คืนข้อมูลจากหน่วยความจำได้! ข้อมูลอาจเสียหาย', 'error');
                    Logger.critical('SYSTEM', 'Failed to restore from in-memory backup!', restoreError);
                }
            }
        } finally {
            resetInput();
        }
    };


    return (
        <div className="settings-card">
            <h3>จัดการข้อมูล (สำรองและกู้คืน)</h3>
            <p className="text-secondary">
                สำรองข้อมูลทั้งหมดในฐานข้อมูล (เมนู, ประวัติการขาย, ล็อก) เพื่อนำไปกู้คืนในอนาคตหรือย้ายเครื่อง
            </p>

            <div className="settings-divider"></div>
            
            <h4>สำรองข้อมูล (Export)</h4>
            <p className="text-secondary" style={{ marginBottom: '1rem' }}>
                สร้างไฟล์ .json ที่มีข้อมูลทั้งหมดของคุณในปัจจุบัน
            </p>
            <button className="action-button" onClick={handleExport} disabled={!isAdminMode}>
                <span className="material-symbols-outlined">cloud_upload</span> สำรองข้อมูลทั้งหมด
            </button>
            
            <div className="settings-divider"></div>

            <h4>กู้คืนข้อมูล (Restore)</h4>
            <div className="info-box warning">
                <span className="material-symbols-outlined">warning</span>
                <p><strong>คำเตือน:</strong> การกู้คืนข้อมูลจะลบข้อมูลปัจจุบันทั้งหมดและแทนที่ด้วยข้อมูลจากไฟล์สำรอง การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            </div>
            <input 
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                ref={fileInputRef} 
                className="hidden" 
                id="restore-input" 
                disabled={!isAdminMode}
            />
            <label htmlFor="restore-input" className={`action-button danger-button ${!isAdminMode ? 'disabled' : ''}`}>
                <span className="material-symbols-outlined">cloud_download</span> เลือกไฟล์ .json เพื่อกู้คืน
            </label>
        </div>
    );
}