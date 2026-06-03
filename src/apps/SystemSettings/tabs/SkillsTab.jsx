import React, { useState, useEffect } from 'react';

const SkillsTab = () => {
    const [skillManifestUrl, setSkillManifestUrl] = useState('');
    const [skillName, setSkillName] = useState('');
    const [skillDescription, setSkillDescription] = useState('');
    const [skillEntrypoint, setSkillEntrypoint] = useState('');
    const [skillId, setSkillId] = useState('');
    const [skillIcons, setSkillIcons] = useState([]);
    const [selectedIconIndex, setSelectedIconIndex] = useState(null);
    const [installedSkills, setInstalledSkills] = useState([]);
    const [isGeneratingIcons, setIsGeneratingIcons] = useState(false);
    const [isInstallingSkill, setIsInstallingSkill] = useState(false);

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
            const res = await fetch(skillManifestUrl);
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

            const iconRes = await fetch('/api/skills/generate-icons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: manifest.name, description: manifest.description })
            });
            const iconData = await iconRes.json();
            if (!iconRes.ok) throw new Error(iconData.error || 'Failed to generate icons');
            
            setSkillIcons(iconData.icons);
            setSelectedIconIndex(null);
        } catch (err) {
            console.error('Error loading manifest:', err);
            alert(err.message);
        } finally {
            setIsGeneratingIcons(false);
        }
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
            const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchInstalledSkills();
                window.dispatchEvent(new Event('skills-updated'));
            }
        } catch (err) {
            console.error('Uninstall error:', err);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Install Skill */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xl">🧩</span>
                    <h2 className="font-semibold text-indigo-900">Install New Skill</h2>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                    Enter a manifest URL to install a new third-party skill. The system will automatically fetch the manifest and use Gemini AI to generate 3 beautiful macOS-style SVG icons for you to choose from.
                </p>

                <div className="mb-4 flex gap-2">
                    <input
                        type="text"
                        placeholder="https://example.com/manifest.json"
                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 text-xs rounded-lg p-2"
                        value={skillManifestUrl}
                        onChange={(e) => setSkillManifestUrl(e.target.value)}
                        disabled={isGeneratingIcons || isInstallingSkill}
                    />
                    <button
                        onClick={handleLoadManifest}
                        disabled={!skillManifestUrl || isGeneratingIcons || isInstallingSkill}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                        {isGeneratingIcons ? 'Fetching & Generating AI Icons...' : 'Load & Generate Icons'}
                    </button>
                </div>

                {skillName && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                        <h3 className="font-bold text-sm text-gray-800 mb-1">{skillName}</h3>
                        <p className="text-xs text-gray-600 mb-3">{skillDescription}</p>
                        
                        {skillIcons.length > 0 && (
                            <>
                                <p className="text-xs font-semibold text-gray-700 mb-2">Select an AI-generated Icon:</p>
                                <div className="flex gap-4 mb-4">
                                    {skillIcons.map((iconUrl, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => setSelectedIconIndex(idx)}
                                            className={`p-2 rounded-xl cursor-pointer border-2 transition-all ${selectedIconIndex === idx ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-gray-200'}`}
                                        >
                                            <img src={iconUrl} alt={`Candidate ${idx+1}`} className="w-16 h-16 object-contain" />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleInstallSkill}
                                    disabled={selectedIconIndex === null || isInstallingSkill}
                                    className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                >
                                    {isInstallingSkill ? 'Installing...' : 'Install Skill'}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Installed Skills */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <h2 className="font-semibold text-gray-900 mb-4">Installed Skills</h2>
                <div className="space-y-2">
                    {installedSkills.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No skills installed yet.</p>
                    ) : (
                        installedSkills.map(skill => (
                            <div key={skill.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center gap-4">
                                    {skill.icon_url && (skill.icon_url.startsWith('http') || skill.icon_url.startsWith('data:image')) ? (
                                        <img src={skill.icon_url} alt={skill.name} className="w-10 h-10 object-contain drop-shadow-sm" />
                                    ) : (
                                        <span className="text-3xl">{skill.icon_url}</span>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-800">{skill.name}</h3>
                                        <p className="text-xs text-gray-500 max-w-md truncate">{skill.description}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">ID: {skill.id}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUninstallSkill(skill.id)}
                                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                                >
                                    Uninstall
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SkillsTab;
