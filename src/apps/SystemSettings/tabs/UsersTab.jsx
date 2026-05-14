import React, { useState, useEffect } from 'react';
import AvatarCreatorModal from '../../../components/AvatarCreatorModal';

const UsersTab = ({ user, rbacPolicies, hasAction }) => {
    const [usersList, setUsersList] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [selectedRolesToAdd, setSelectedRolesToAdd] = useState({});
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    console.log("UsersTab render! User:", user);
    console.log("UsersTab hasAction('action:manage_users'):", hasAction ? hasAction('action:manage_users') : 'undefined');

    async function fetchUsersList() {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsersList(await res.json());
        } catch (e) { console.error(e); }
    }

    async function fetchInvitations() {
        try {
            const res = await fetch('/api/invitations');
            if (res.ok) setInvitations(await res.json());
        } catch (e) { console.error(e); }
    }

    useEffect(() => {
        if (hasAction && (hasAction('action:manage_users') || hasAction('action:invite_users'))) {
            fetchUsersList();
            fetchInvitations();
        }
    }, [user]);



    const handleInviteUser = async () => {
        if (!inviteEmail) return;
        try {
            const res = await fetch('/api/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail })
            });
            const data = await res.json();
            if (res.ok) {
                setInviteEmail('');
                fetchInvitations();
                alert('User invited successfully!');
            } else {
                alert(data.error || 'Failed to invite user');
            }
        } catch (e) { console.error(e); }
    };

    const handleRoleUpdate = async (id, newRoleString) => {
        // Optimistic update
        setUsersList(usersList.map(u => u.id === id ? { ...u, role: newRoleString } : u));

        try {
            const res = await fetch(`/api/users/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRoleString })
            });
            if (!res.ok) {
                fetchUsersList();
                alert('Failed to update role');
            }
        } catch (e) { console.error(e); }
    };

    const handleAddRole = (u, roleKey) => {
        if (!roleKey) return;
        const roles = (u.role || 'user').split(',').map(r => r.trim()).filter(Boolean);
        if (!roles.includes(roleKey)) {
            roles.push(roleKey);
            handleRoleUpdate(u.id, roles.join(','));
        }
        setSelectedRolesToAdd({ ...selectedRolesToAdd, [u.id]: '' });
    };

    const handleRemoveRole = (u, roleKey) => {
        if (u.email === user.email && roleKey === 'admin') {
            alert('Cannot remove admin role from yourself.');
            return;
        }
        if (roleKey === 'admin' && usersList.filter(us => (us.role||'').includes('admin')).length === 1) {
            alert('Cannot remove the last admin.');
            return;
        }
        
        let roles = (u.role || 'user').split(',').map(r => r.trim()).filter(Boolean);
        roles = roles.filter(r => r !== roleKey);
        if (roles.length === 0) roles = ['user'];
        handleRoleUpdate(u.id, roles.join(','));
    };

    const handleCancelInvite = async (email) => {
        try {
            const res = await fetch(`/api/invitations/${email}`, { method: 'DELETE' });
            if (res.ok) fetchInvitations();
        } catch (e) { console.error(e); }
    };

    const handleRemoveUser = async (id, email) => {
        if (!confirm(`Are you sure you want to remove user ${email}?`)) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) fetchUsersList();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6">
            {/* Current User Card */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="relative w-12 h-12 rounded-full overflow-hidden group border border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        title="アバターを変更"
                    >
                        {user?.avatar_url || user?.avatarUrl ? (
                            <img src={user?.avatar_url || user?.avatarUrl} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                        ) : (
                            <div className="w-full h-full bg-white/20 flex items-center justify-center text-lg font-medium shadow-inner transition-transform group-hover:scale-110">
                                {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-bold">変更</span>
                        </div>
                    </button>
                    <div>
                        <div className="font-medium">{user?.name}</div>
                        <div className="text-sm opacity-60">{user?.email}</div>
                    </div>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full text-sm">
                    {user?.role}
                </div>
            </div>

            {hasAction && (hasAction('action:manage_users') || hasAction('action:invite_users')) && (
                <>
                    {/* Invite User */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h2 className="font-semibold mb-3">Invite User (ドメイン外ユーザーも可能)</h2>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="Email address"
                                className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2"
                            />
                            <button
                                onClick={handleInviteUser}
                                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Send Invite
                            </button>
                        </div>
                    </div>

                    {/* Users List */}
                    <div>
                        <h2 className="font-semibold mb-3 text-lg">Active Users</h2>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            {usersList.map(u => (
                                <div key={u.id} className="p-4 border-b border-white/10 flex items-center justify-between last:border-0">
                                    <div className="flex items-center gap-3">
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                {u.name?.charAt(0) || u.email.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium">{u.name || 'Unknown'}</div>
                                            <div className="text-sm opacity-60">{u.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 w-72">
                                        <div className="flex flex-wrap gap-2">
                                            {(() => {
                                                const userRoles = (u.role || 'user').split(',').map(r => r.trim()).filter(Boolean);
                                                return userRoles.map(roleKey => {
                                                    const roleInfo = rbacPolicies?.[roleKey] || { name: roleKey };
                                                    const isProtectedAdmin = roleKey === 'admin' && (u.email === user.email || usersList.filter(us => (us.role||'').includes('admin')).length === 1);
                                                    return (
                                                        <span key={roleKey} className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1.5 shadow-sm">
                                                            {roleInfo.name || roleKey}
                                                            {hasAction('action:manage_roles') && !isProtectedAdmin && (
                                                                <button onClick={() => handleRemoveRole(u, roleKey)} className="hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full w-4 h-4 hover:bg-red-500/20">
                                                                    ✕
                                                                </button>
                                                            )}
                                                        </span>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        {hasAction('action:manage_roles') && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <select 
                                                    value={selectedRolesToAdd[u.id] || ''} 
                                                    onChange={(e) => setSelectedRolesToAdd({...selectedRolesToAdd, [u.id]: e.target.value})}
                                                    className="flex-1 bg-black/20 text-xs border border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-500/50 appearance-none"
                                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff60'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em' }}
                                                >
                                                    <option value="" disabled>Select role to add...</option>
                                                    {Object.keys(rbacPolicies || {})
                                                        .filter(k => !(u.role || 'user').split(',').map(r => r.trim()).includes(k))
                                                        .map(k => (
                                                            <option key={k} value={k}>{rbacPolicies[k]?.name || k}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    onClick={() => handleAddRole(u, selectedRolesToAdd[u.id])}
                                                    disabled={!selectedRolesToAdd[u.id]}
                                                    className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center ml-4">
                                        {hasAction('action:manage_users') && (
                                            <button
                                                onClick={() => handleRemoveUser(u.id, u.email)}
                                                disabled={u.email === user.email}
                                                className="text-red-400 hover:text-red-300 disabled:opacity-30 text-sm"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div>
                            <h2 className="font-semibold mb-3 text-lg">Pending Invitations</h2>
                            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                {invitations.map(inv => (
                                    <div key={inv.id} className="p-4 border-b border-white/10 flex items-center justify-between last:border-0">
                                        <div>
                                            <div className="font-medium">{inv.email}</div>
                                            <div className="text-sm opacity-60">Invited: {new Date(inv.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleCancelInvite(inv.email)}
                                            className="text-sm text-red-400 hover:text-red-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {isAvatarModalOpen && (
                <AvatarCreatorModal 
                    onClose={() => setIsAvatarModalOpen(false)}
                    onAvatarUpdate={() => window.location.reload()}
                />
            )}
        </div>
    );
};

export default UsersTab;
