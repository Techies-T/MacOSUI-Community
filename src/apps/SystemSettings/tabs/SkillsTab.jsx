import React, { useState, useEffect } from 'react';

const SkillsTab = () => {
    const [skillManifestUrl, setSkillManifestUrl] = useState('');
    const [skillName, setSkillName] = useState('');
    const [skillDescription, setSkillDescription] = useState('');
    const [skillEntrypoint, setSkillEntrypoint] = useState('');
    const [skillId, setSkillId] = useState('');
    const [skillIcons, setSkillIcons] = useState([]);
    const [selectedIconIndex, setSelectedIconIndex] = useState(null);
    const [newSkillCustomPrompt, setNewSkillCustomPrompt] = useState('');
    const [installedSkills, setInstalledSkills] = useState([]);
    const [isGeneratingIcons, setIsGeneratingIcons] = useState(false);
    const [isInstallingSkill, setIsInstallingSkill] = useState(false);

    // Editing State for Existing Skills
    const [editingSkillId, setEditingSkillId] = useState(null);
    const [editCustomPrompt, setEditCustomPrompt] = useState('');
    const [editingSkillIcons, setEditingSkillIcons] = useState([]);
    const [selectedEditingIconIdx, setSelectedEditingIconIdx] = useState(null);
    const [isGeneratingEditIcons, setIsGeneratingEditIcons] = useState(false);
    const [isSavingEditIcon, setIsSavingEditIcon] = useState(false);

    const fetchInstalledSkills = async () => {
        try {
            const res = await fetch('/api/skills');
            if (res.ok) setInstalledSkills(await res.json());
        } catch (e) { console.error("Failed to fetch installed skills", e); }
    };

    useEffect(() => {
        fetchInstalledSkills();
    }, []);

    const handleLoadManifest = async () => {
        if (!skillManifestUrl) return;
        try {
            setIsGeneratingIcons(true);
            const res = await fetch(`/api/skills/manifest?url=${encodeURIComponent(skillManifestUrl)}`);
            if (!res.ok) throw new Error('Failed to load manifest JSON');
            
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('Failed to parse manifest: The URL returned an HTML page instead of JSON. Please check if the URL is correct (e.g., includes "/demo-skill/manifest.json").');
            }

            const manifest = await res.json();
            
            if (!manifest.id || !manifest.name || !manifest.entrypoint) {
                throw new Error('Manifest is missing required fields (id, name, entrypoint)');
            }

            setSkillId(manifest.id);
            setSkillName(manifest.name);
            setSkillDescription(manifest.description || 'No description provided');
            setSkillEntrypoint(manifest.entrypoint);
            setNewSkillCustomPrompt(''); // Reset prompt

            // Generate icons automatically on first load using name & desc
            await generateIconsForNewSkill(manifest.name, manifest.description, '');
        } catch (err) {
            console.error('Error loading manifest:', err);
            alert(err.message);
        } finally {
            setIsGeneratingIcons(false);
        }
    };

    const generateIconsForNewSkill = async (name, desc, promptText) => {
        setIsGeneratingIcons(true);
        try {
            const iconRes = await fetch('/api/skills/generate-icons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: desc, prompt: promptText })
            });
            const iconData = await iconRes.json();
            if (!iconRes.ok) throw new Error(iconData.error || 'Failed to generate icons');
            
            setSkillIcons(iconData.icons);
            setSelectedIconIndex(null);
        } catch (err) {
            console.error('Error generating icons:', err);
            alert(err.message);
        } finally {
            setIsGeneratingIcons(false);
        }
    };

    const handleRegenerateNewSkillIcons = () => {
        generateIconsForNewSkill(skillName, skillDescription, newSkillCustomPrompt);
    };

    const handleInstallSkill = async () => {
        if (!skillId || selectedIconIndex === null) return;
        setIsInstallingSkill(true);
        try {
            const payload = {
                id: skillId,
                name: skillName,
                description: skillDescription,
                entrypoint_url: skillEntrypoint,
                manifest_url: skillManifestUrl,
                icon_url: skillIcons[selectedIconIndex]
            };

            const res = await fetch('/api/skills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert('Skill installed successfully!');
                setSkillManifestUrl('');
                setSkillId('');
                setSkillName('');
                setSkillDescription('');
                setSkillEntrypoint('');
                setSkillIcons([]);
                setSelectedIconIndex(null);
                setNewSkillCustomPrompt('');
                
                fetchInstalledSkills();
                window.dispatchEvent(new Event('skills-updated'));
            } else {
                const data = await res.json();
                alert(data.error || 'Installation failed');
            }
        } catch (err) {
            console.error('Install error:', err);
            alert('Failed to install skill');
        } finally {
            setIsInstallingSkill(false);
        }
    };

    const handleUninstallSkill = async (id) => {
        if (!confirm('Are you sure you want to uninstall this skill?')) return;
        try {
            const res = await fetch(`/api/skills?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (res.ok) {
                fetchInstalledSkills();
                window.dispatchEvent(new Event('skills-updated'));
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to uninstall skill');
            }
        } catch (err) {
            console.error('Uninstall error:', err);
            alert('Failed to uninstall skill');
        }
    };

    // Edit Icon Handlers
    const handleStartEditIcon = (skill) => {
        setEditingSkillId(skill.id);
        setEditCustomPrompt('');
        setEditingSkillIcons([]);
        setSelectedEditingIconIdx(null);
    };

    const handleCancelEditIcon = () => {
        setEditingSkillId(null);
        setEditCustomPrompt('');
        setEditingSkillIcons([]);
        setSelectedEditingIconIdx(null);
    };

    const handleGenerateEditIcons = async (skill) => {
        setIsGeneratingEditIcons(true);
        try {
            const res = await fetch('/api/skills/generate-icons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: skill.name, 
                    description: skill.description, 
                    prompt: editCustomPrompt 
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate icons');
            setEditingSkillIcons(data.icons);
            setSelectedEditingIconIdx(null);
        } catch (err) {
            console.error('Edit icon generate error:', err);
            alert(err.message);
        } finally {
            setIsGeneratingEditIcons(false);
        }
    };

    const handleSaveEditIcon = async (skillId) => {
        if (selectedEditingIconIdx === null) return;
        setIsSavingEditIcon(true);
        try {
            const res = await fetch(`/api/skills/icon?id=${encodeURIComponent(skillId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ icon_url: editingSkillIcons[selectedEditingIconIdx] })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Icon updated successfully!');
                setEditingSkillId(null);
                setEditingSkillIcons([]);
                setSelectedEditingIconIdx(null);
                
                fetchInstalledSkills();
                window.dispatchEvent(new Event('skills-updated'));
            } else {
                alert(data.error || 'Failed to update icon');
            }
        } catch (err) {
            console.error('Save icon error:', err);
            alert('Failed to update icon');
        } finally {
            setIsSavingEditIcon(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn text-gray-800">
            {/* Install Skill */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🧩</span>
                    <h2 className="font-semibold text-indigo-900 text-base">Install New Skill (Agent)</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                    Enter a manifest URL to install a new third-party skill. The system will automatically fetch the manifest and use Gemini AI to generate 3 beautiful macOS-style SVG icons for you to choose from. You can also customize the icon prompt to fit your design preference.
                </p>

                <div className="mb-4 flex gap-2">
                    <input
                        type="text"
                        placeholder="https://example.com/manifest.json"
                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        value={skillManifestUrl}
                        onChange={(e) => setSkillManifestUrl(e.target.value)}
                        disabled={isGeneratingIcons || isInstallingSkill}
                    />
                    <button
                        onClick={handleLoadManifest}
                        disabled={!skillManifestUrl || isGeneratingIcons || isInstallingSkill}
                        className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                        {isGeneratingIcons ? 'Loading Manifest...' : 'Load Manifest & Generate Icons'}
                    </button>
                </div>

                {skillName && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                        <div>
                            <h3 className="font-bold text-sm text-gray-900 mb-1">{skillName}</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">{skillDescription}</p>
                        </div>
                        
                        {/* Customize Prompt Input */}
                        <div className="border-t border-gray-200 pt-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Customize Icon Concept (Optional):</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g., A minimalist blue database, sleek server, flat cloud icon..."
                                    className="flex-1 bg-white border border-gray-300 text-gray-900 text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={newSkillCustomPrompt}
                                    onChange={(e) => setNewSkillCustomPrompt(e.target.value)}
                                    disabled={isGeneratingIcons}
                                />
                                <button
                                    onClick={handleRegenerateNewSkillIcons}
                                    disabled={isGeneratingIcons}
                                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg font-medium transition-colors"
                                >
                                    Regenerate Icons
                                </button>
                            </div>
                        </div>

                        {skillIcons.length > 0 && (
                            <div className="border-t border-gray-200 pt-4">
                                <p className="text-xs font-semibold text-gray-700 mb-3">Select an AI-generated Icon:</p>
                                <div className="flex gap-4 mb-4">
                                    {skillIcons.map((iconUrl, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setSelectedIconIndex(idx)}
                                            className={`p-3 rounded-xl cursor-pointer border-2 bg-white shadow-sm transition-all ${selectedIconIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            <img src={iconUrl} alt={`Candidate ${idx+1}`} className="w-16 h-16 object-contain" />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleInstallSkill}
                                    disabled={selectedIconIndex === null || isInstallingSkill}
                                    className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 shadow-sm transition-colors"
                                >
                                    {isInstallingSkill ? 'Installing Skill...' : 'Install Skill'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Installed Skills */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="font-semibold text-gray-900 text-base mb-4">Installed Skills (Agents)</h2>
                <div className="space-y-4">
                    {installedSkills.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No skills installed yet.</p>
                    ) : (
                        installedSkills.map(skill => (
                            <div key={skill.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
                                            {skill.icon_url && (skill.icon_url.startsWith('http') || skill.icon_url.startsWith('data:image')) ? (
                                                <img src={skill.icon_url} alt={skill.name} className="w-9 h-9 object-contain" />
                                            ) : (
                                                <span className="text-2xl">{skill.icon_url || '🧩'}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-900">{skill.name}</h3>
                                            <p className="text-xs text-gray-500 max-w-md truncate">{skill.description}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">ID: {skill.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStartEditIcon(skill)}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors border border-indigo-100"
                                        >
                                            Change Icon
                                        </button>
                                        <button
                                            onClick={() => handleUninstallSkill(skill.id)}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors border border-red-100"
                                        >
                                            Uninstall
                                        </button>
                                    </div>
                                </div>

                                {/* Inline Icon Editing Section */}
                                {editingSkillId === skill.id && (
                                    <div className="p-4 bg-white border-t border-gray-100 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-indigo-900">Customize Icon for {skill.name}</h4>
                                            <button 
                                                onClick={handleCancelEditIcon}
                                                className="text-xs text-gray-400 hover:text-gray-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Enter Icon Prompt:</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="e.g., flat red shield with star, futuristic gear icon..."
                                                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        value={editCustomPrompt}
                                                        onChange={(e) => setEditCustomPrompt(e.target.value)}
                                                        disabled={isGeneratingEditIcons || isSavingEditIcon}
                                                    />
                                                    <button
                                                        onClick={() => handleGenerateEditIcons(skill)}
                                                        disabled={!editCustomPrompt || isGeneratingEditIcons || isSavingEditIcon}
                                                        className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                                                    >
                                                        {isGeneratingEditIcons ? 'Generating...' : 'Generate New Icons'}
                                                    </button>
                                                </div>
                                            </div>

                                            {editingSkillIcons.length > 0 && (
                                                <div className="pt-2">
                                                    <p className="text-[11px] font-semibold text-gray-700 mb-2">Select new icon candidate:</p>
                                                    <div className="flex gap-4 mb-4">
                                                        {editingSkillIcons.map((iconUrl, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                onClick={() => setSelectedEditingIconIdx(idx)}
                                                                className={`p-3 rounded-xl cursor-pointer border-2 bg-white shadow-sm transition-all ${selectedEditingIconIdx === idx ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-100'}`}
                                                            >
                                                                <img src={iconUrl} alt={`New Candidate ${idx+1}`} className="w-14 h-14 object-contain" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => handleSaveEditIcon(skill.id)}
                                                        disabled={selectedEditingIconIdx === null || isSavingEditIcon}
                                                        className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 shadow-sm transition-colors"
                                                    >
                                                        {isSavingEditIcon ? 'Saving Icon...' : 'Apply & Save Icon'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SkillsTab;
