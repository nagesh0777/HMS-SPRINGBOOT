import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Edit, Mail, Phone, Briefcase, Clock,
    Shield, ShieldCheck, Info, Lock, Power, RefreshCw,
    Activity, Trash2, LogIn, LogOut,
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import PromptModal from '../../components/ui/PromptModal';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback, initials } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const ACCESS_BADGE = { SuperAdmin: 'secondary', Admin: 'info' };

const StaffDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState([]);

    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showChangePasswordPrompt, setShowChangePasswordPrompt] = useState(false);

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'Admin') { navigate('/dashboard'); return; }
        fetchStaff();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const [staffRes, attRes] = await Promise.all([
                axios.get(`/api/Employee/${id}`),
                axios.get('/api/Attendance/All'),
            ]);
            if (staffRes.data.Results) setStaff(staffRes.data.Results);
            if (attRes.data.Results) {
                const filtered = attRes.data.Results.filter(l => l.employeeId === parseInt(id));
                setAttendance(filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
            }
        } catch (err) {
            console.error('Error fetching staff details', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        try {
            await axios.put(`/api/Employee/${id}`, { ...staff, isActive: !staff.isActive });
            toast.success(staff.isActive ? 'User access deactivated' : 'User access activated');
            fetchStaff();
        } catch (error) { toast.error('Failed to update status'); }
    };

    const handleChangePassword = async (newPassword) => {
        try {
            await axios.put(`/api/Employee/${id}`, { ...staff, password: newPassword });
            toast.success('Password updated successfully!');
            fetchStaff();
        } catch (error) { toast.error('Failed to update password.'); }
    };

    const handleResetPassword = async () => {
        try {
            // No password in the payload: the backend leaves an existing password alone rather
            // than resetting it to a shared default on every profile save.
            await axios.put(`/api/Employee/${id}`, { ...staff });
            toast.success('Password reset. The new one-time password is shown in the response — share it directly.');
            fetchStaff();
        } catch (error) { toast.error('Failed to reset password.'); }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/api/Employee/${id}`);
            toast.success('Staff record deleted successfully');
            navigate('/dashboard/staff');
        } catch (error) { toast.error('Failed to delete staff member.'); }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl space-y-6">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-1"><Skeleton className="h-[400px]" /><Skeleton className="h-[250px]" /></div>
                    <div className="space-y-6 lg:col-span-2"><Skeleton className="h-[200px]" /><Skeleton className="h-[150px]" /><Skeleton className="h-[300px]" /></div>
                </div>
            </div>
        );
    }
    if (!staff) return <Card><EmptyState title="Staff member not found" /></Card>;

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/staff')} className="-ml-2 text-muted-foreground">
                <ArrowLeft /> Back to directory
            </Button>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <Card className="overflow-hidden p-0">
                        <div className="bg-muted/40 p-6 text-center">
                            <div className="relative mx-auto mb-4 h-24 w-24">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                                    {staff.photoPath && <AvatarImage src={staff.photoPath} alt="" />}
                                    <AvatarFallback className="bg-primary text-2xl text-primary-foreground">{initials(`${staff.firstName} ${staff.lastName}`)}</AvatarFallback>
                                </Avatar>
                                <span className={cn(
                                    'absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-background',
                                    staff.status === 'Active' ? 'bg-success' : staff.status === 'On Leave' ? 'bg-warning' : 'bg-destructive',
                                )} />
                            </div>
                            <h1 className="text-xl font-semibold">{staff.firstName} {staff.lastName}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">{staff.role}</p>
                            <Badge variant="secondary" className="mt-3 tabular">EMP-{staff.employeeId}</Badge>
                        </div>
                        <div className="space-y-3 p-5 text-sm">
                            <div className="flex items-center gap-3"><Briefcase className="h-4 w-4 text-muted-foreground" /> <span>{staff.department}</span></div>
                            <div className="flex items-center gap-3 tabular"><Phone className="h-4 w-4 text-muted-foreground" /> <span>{staff.phoneNumber}</span></div>
                            <div className="flex items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-muted-foreground" /> <span className="truncate">{staff.email}</span></div>
                            <div className="flex items-center gap-2.5 border-t pt-3">
                                <span className={cn('h-1.5 w-1.5 rounded-full', staff.isActive ? 'bg-success' : 'bg-destructive')} />
                                <span className="text-xs font-medium text-muted-foreground">{staff.isActive ? 'System access enabled' : 'Access restricted'}</span>
                            </div>
                        </div>
                    </Card>

                    {localStorage.getItem('role') === 'Admin' && (
                        <Card className="space-y-2 p-5">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions &amp; controls</h3>
                            <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/dashboard/staff/edit/${id}`)}>
                                <Edit className="text-info" /> Edit profile
                            </Button>
                            <Button variant="outline" className="w-full justify-start" onClick={() => setShowChangePasswordPrompt(true)}>
                                <Lock className="text-info" /> Change password
                            </Button>
                            <Button variant="outline" className="w-full justify-start" onClick={() => setShowResetPasswordConfirm(true)}>
                                <RefreshCw className="text-warning" /> Reset password
                            </Button>
                            <Button
                                variant="outline"
                                className={cn('w-full justify-start', staff.isActive ? 'text-destructive hover:bg-destructive-subtle' : 'text-success hover:bg-success-subtle')}
                                onClick={() => setShowDeactivateConfirm(true)}
                            >
                                <Power /> {staff.isActive ? 'Deactivate user' : 'Activate user'}
                            </Button>
                            <div className="pt-2">
                                <Button variant="destructive" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
                                    <Trash2 /> Delete staff record
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-6">
                        <h3 className="mb-5 flex items-center gap-2 text-base font-semibold">
                            <ShieldCheck className="h-[18px] w-[18px] text-muted-foreground" /> Login &amp; access info
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Username</p>
                                <p className="mt-1.5 font-medium">@{staff.userName || 'Not assigned'}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Access level</p>
                                <Badge variant={ACCESS_BADGE[staff.accessLevel] || 'secondary'} className="mt-1.5 gap-1.5">
                                    <Shield className="h-3 w-3" /> {staff.accessLevel || 'Standard'}
                                </Badge>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned modules</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {(staff.assignedModules || 'General Access').split(',').map((mod, idx) => (
                                        <Badge key={idx} variant="outline">{mod.trim()}</Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="mb-5 flex items-center gap-2 text-base font-semibold">
                            <Clock className="h-[18px] w-[18px] text-muted-foreground" /> Work information
                        </h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Shift timing</p><p className="mt-1.5 font-medium">{staff.shiftTiming || 'Not scheduled'}</p></div>
                            <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duty days</p><p className="mt-1.5 font-medium">{staff.dutyDays || 'N/A'}</p></div>
                            <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Station / ward</p><p className="mt-1.5 font-medium">{staff.assignedWard || 'Unassigned'}</p></div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                <Activity className="h-[18px] w-[18px] text-muted-foreground" /> Recent history
                            </h3>
                            <Badge variant="secondary" className="tabular">{attendance.length} logs</Badge>
                        </div>
                        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                            {attendance.length > 0 ? attendance.map((log, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3.5">
                                    <div className="flex items-center gap-3">
                                        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', log.type === 'ClockIn' ? 'bg-info-subtle text-info' : 'bg-warning-subtle text-warning')}>
                                            {log.type === 'ClockIn' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">{log.type === 'ClockIn' ? 'Checked in' : 'Checked out'}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                        </div>
                                    </div>
                                    {log.remarks && <Badge variant="outline">{log.remarks}</Badge>}
                                </div>
                            )) : (
                                <EmptyState icon={Activity} title="No attendance history recorded yet" />
                            )}
                        </div>
                    </Card>

                    <Card className="border-l-4 border-l-warning p-6">
                        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                            <Info className="h-[18px] w-[18px] text-warning" /> Administrative notes
                        </h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {staff.adminNotes || 'No administrative remarks for this staff member.'}
                        </p>
                    </Card>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeactivateConfirm}
                onClose={() => setShowDeactivateConfirm(false)}
                onConfirm={handleDeactivate}
                title={staff.isActive ? 'Deactivate staff access' : 'Activate staff access'}
                message={staff.isActive
                    ? `Deactivate system login and duty shifts for ${staff.firstName} ${staff.lastName}? They will be blocked from logging into the portal immediately.`
                    : `Reactivate access for ${staff.firstName} ${staff.lastName}? They will be able to log back into the system.`}
                confirmText={staff.isActive ? 'Deactivate' : 'Activate'}
                cancelText="Cancel"
                type={staff.isActive ? 'danger' : 'info'}
            />
            <ConfirmationModal
                isOpen={showResetPasswordConfirm}
                onClose={() => setShowResetPasswordConfirm(false)}
                onConfirm={handleResetPassword}
                title="Reset password to default"
                message={`Reset the password for ${staff.firstName} ${staff.lastName}? They will get a new one-time password which you must share with them directly.`}
                confirmText="Reset password"
                cancelText="Cancel"
                type="warning"
            />
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete staff record"
                message={`This permanently deletes the profile, role permissions and credential account for ${staff.firstName} ${staff.lastName}. This action is irreversible.`}
                confirmText="Permanently delete"
                cancelText="Cancel"
                type="danger"
            />
            <PromptModal
                isOpen={showChangePasswordPrompt}
                onClose={() => setShowChangePasswordPrompt(false)}
                onSubmit={handleChangePassword}
                title="Change staff password"
                message={`Enter the new login password for ${staff.firstName} ${staff.lastName}:`}
                placeholder="Enter new password (min. 6 characters)"
                inputType="password"
                submitText="Update password"
                cancelText="Cancel"
            />
        </div>
    );
};

export default StaffDetails;
