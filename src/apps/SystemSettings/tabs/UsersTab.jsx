import React, { useState, useEffect } from 'react';

const UsersTab = ({ user }) => {
    const [usersList, setUsersList] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchUsersList();
            fetchInvitations();
        }
    }, [user]);

    const fetchUsersList = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsersList(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchInvitations = async () => {
        try {
            const res = await fetch('/api/invitations');
            if (res.ok) setInvitations(await res.json());
        } catch (e) { console.error(e); }
    };

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

    const handleRoleChange = async (id, newRole) => {
        try {
            const res = await fetch(`/api/users/${id}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) fetchUsersList();
        } catch (e) { console.error(e); }
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
                    <img src={user?.picture} alt="Profile" className="w-12 h-12 rounded-full" />
                    <div>
                        <div className="font-medium">{user?.name}</div>
                        <div className="text-sm opacity-60">{user?.email}</div>
                    </div>
                </div>
                <div className="px-3 py-1 bg-white/10 rounded-full text-sm">
                    {user?.role}
                </div>
            </div>

            {user?.role === 'admin' && (
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
                                        {u.picture ? (
                                            <img src={u.picture} alt="" className="w-8 h-8 rounded-full" />
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
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            disabled={u.email === user.email}
                                            className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm disabled:opacity-50"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveUser(u.id, u.email)}
                                            disabled={u.email === user.email}
                                            className="text-red-400 hover:text-red-300 disabled:opacity-30"
                                        >
                                            Remove
                                        </button>
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
                                            <div className="text-sm opacity-60">Invited: {new Date(inv.invited_at).toLocaleDateString()}</div>
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
        </div>
    );
};

export default UsersTab;
