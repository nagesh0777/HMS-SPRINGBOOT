import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Printer, Download, Search, User, Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StaffQR = () => {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');


    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/Employee/Employees');
            if (res.data.Results) {
                setStaffList(res.data.Results);
            }
        } catch (err) {
            console.error("Failed to fetch staff", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredStaff = staffList.filter(s =>
        (s.firstName + ' ' + s.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.employeeId.toString().includes(searchTerm)
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard/staff')}
                        className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-primary-600 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff ID Generator</h1>
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Generate and print QR authentication codes</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            className="bg-white pl-12 pr-4 py-3 rounded-2xl border border-gray-100 shadow-sm text-sm font-bold w-full focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handlePrint}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary-100 hover:bg-primary-700 hover:-translate-y-1 transition-all"
                    >
                        <Printer size={18} /> PRINT ALL
                    </button>
                </div>
            </div>

            {/* Print Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="printable-area">
                {loading ? (
                    <div className="col-span-full py-20 text-center font-bold text-gray-400">Loading identity cards...</div>
                ) : filteredStaff.length > 0 ? filteredStaff.map((staff) => (
                    <div key={staff.employeeId} className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-2xl transition-all break-inside-avoid mb-6">
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary-600 to-primary-700 opacity-10 group-hover:opacity-20 transition-all"></div>

                        {/* Avatar */}
                        <div className="relative z-10 mt-4 mb-6">
                            <div className="h-24 w-24 rounded-[1.5rem] border-4 border-white shadow-2xl overflow-hidden bg-white ring-4 ring-primary-50">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${staff.firstName}+${staff.lastName}&background=f3f4f6&color=374151&bold=true&size=200`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary-600 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                                <Shield size={16} />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-1 mb-8">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{staff.firstName} {staff.lastName}</h3>
                            <p className="text-xs font-black text-primary-600 uppercase tracking-[0.2em]">{staff.role}</p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">Dept: {staff.department}</span>
                                <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">ID: {staff.employeeId}</span>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="p-6 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 group-hover:border-primary-200 transition-all">
                            <QRCodeCanvas
                                value={staff.employeeId.toString()}
                                size={140}
                                level="H"
                                includeMargin={true}
                                className="mix-blend-multiply"
                            />
                        </div>

                        <p className="mt-6 text-[9px] font-black text-gray-400 uppercase tracking-widest no-print">Scan this code to Clock In / Out</p>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center text-gray-400 font-bold">No staff found to generate cards.</div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; }
                    .max-w-7xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                    #printable-area { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 20px !important; }
                    .rounded-[2.5rem], .rounded-[2rem] { border-radius: 1rem !important; }
                    .shadow-xl, .shadow-2xl { box-shadow: none !important; border: 1px solid #eee !important; }
                }
            ` }} />
        </div>
    );
};

export default StaffQR;
