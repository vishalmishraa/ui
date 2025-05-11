import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import useTheme from "../../stores/themeStore";
import { api } from "../../lib/api";
import { FiEye, FiEyeOff } from 'react-icons/fi';
import ProfileSkeleton from './Skeleton';
import { toast } from 'react-hot-toast';

export default function Profile() {
    const theme = useTheme((state) => state.theme);
    const isDark = theme === "dark";
    
    const [formData, setFormData] = useState({
        username: '',
        currentPassword: '',
        newPassword: '',
    });
    
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch user data when component mounts
    useEffect(() => {
        const token = localStorage.getItem("jwtToken");
        if (token) {
            setIsLoading(true);
            api.get("/api/me", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((response) => {
                setFormData(prev => ({
                    ...prev,
                    username: response.data.username
                }));
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching user data:", error);
                setIsLoading(false);
            });
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        api.post('/api/me/update-password', {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
            },
        })
        .then(response => {
            if (response.status === 200) {
                toast.success('Password changed successfully');
                setIsLoading(false);
            } else {
                toast.error('Error changing password');
                setIsLoading(false);
            }
        })
        .catch(() => {
            toast.error('Error changing password');
            setIsLoading(false);
        });
    };

    const toggleCurrentPasswordVisibility = () => {
        setShowCurrentPassword(!showCurrentPassword);
    };

    const toggleNewPasswordVisibility = () => {
        setShowNewPassword(!showNewPassword);
    };

    if (isLoading) {
        return <ProfileSkeleton />;
    }

    return (
        <div className="w-full h-full">
            <div className={`w-full max-w-full p-3 sm:p-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
                    <h1 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: "#2f86ff" }}>
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </span>
                            Profile
                    </h1>
               <div className={`w-full sm:max-w-sm ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'} p-3 sm:p-5 rounded-lg shadow-md mb-3 sm:mb-5`}>
                    <div className="mb-3 sm:mb-5">
                        <label className={`block font-semibold mb-1.5 ${
                            isDark ? 'text-blue-300/80' : 'text-gray-700'
                        }`}>Username</label>
                        <input 
                            type="text" 
                            value={formData.username} 
                            className={`w-full px-2.5 sm:px-3.5 py-1.5 rounded-lg border cursor-not-allowed opacity-60 ${
                                isDark 
                                    ? 'bg-[#1a1f2e] border-blue-300/20 text-white' 
                                    : 'bg-gray-100 border-gray-300 text-gray-800'
                            }`}
                            disabled 
                            readOnly
                        />
                    </div>
                </div>
                
                <div className={`w-full sm:max-w-sm ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'} p-3 sm:p-5 rounded-lg shadow-md`}>
                    <h2 className={`text-base sm:text-lg font-semibold mb-3 ${
                        isDark ? 'text-white' : 'text-gray-800'
                    }`}>Change Password</h2>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3 relative group">
                            <label className={`block font-semibold mb-1.5 ${
                                isDark ? 'text-blue-300/80' : 'text-gray-700'
                            }`}>Current Password</label>
                            <div className="relative">
                                <input 
                                    type={showCurrentPassword ? "text" : "password"}
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className={`w-full pl-2.5 sm:pl-[18px] pr-[60px] py-2 sm:py-3 rounded-lg focus:outline-none ${
                                        isDark 
                                            ? 'bg-[#1a1f2e] border border-blue-300/20 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 text-white placeholder-blue-200/70' 
                                            : 'bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-gray-800 placeholder-gray-400'
                                    }`}
                                    required
                                />
                                <button 
                                    type="button"
                                    className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 ${
                                        isDark ? 'text-blue-300/70 hover:text-blue-300' : 'text-gray-500 hover:text-gray-700'
                                    } border rounded p-0.5 border-gray-600/30 hover:border-blue-400/50 bg-transparent`}
                                    onClick={toggleCurrentPasswordVisibility}
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? 
                                        <FiEyeOff size={14} className="sm:text-[16px]" /> : 
                                        <FiEye size={14} className="sm:text-[16px]" />
                                    }
                                </button>
                            </div>
                        </div>
                        
                        <div className="mb-4 relative group">
                            <label className={`block font-semibold mb-1.5 ${
                                isDark ? 'text-blue-300/80' : 'text-gray-700'
                            }`}>New Password</label>
                            <div className="relative">
                                <input 
                                    type={showNewPassword ? "text" : "password"}
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className={`w-full pl-2.5 sm:pl-[18px] pr-[60px] py-2 sm:py-3 rounded-lg focus:outline-none ${
                                        isDark 
                                            ? 'bg-[#1a1f2e] border border-blue-300/20 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 text-white placeholder-blue-200/70' 
                                            : 'bg-white border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-gray-800 placeholder-gray-400'
                                    }`}
                                    required
                                />
                                <button 
                                    type="button"
                                    className={`absolute right-2.5 top-1/2 transform -translate-y-1/2 ${
                                        isDark ? 'text-blue-300/70 hover:text-blue-300' : 'text-gray-500 hover:text-gray-700'
                                    } border rounded p-0.5 border-gray-600/30 hover:border-blue-400/50 bg-transparent`}
                                    onClick={toggleNewPasswordVisibility}
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? 
                                        <FiEyeOff size={14} className="sm:text-[16px]" /> : 
                                        <FiEye size={14} className="sm:text-[16px]" />
                                    }
                                </button>
                            </div>  
                        </div>
                        
                        <button 
                            type="submit" 
                            className={`w-full font-semibold py-2 sm:py-3 px-3 rounded-lg transition duration-300 ${
                                isDark 
                                    ? 'bg-[#2f86ff] hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/20 hover:translate-y-[-1px]' 
                                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow hover:shadow-blue-500/10 hover:translate-y-[-1px]'
                            }`}
                        >
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}