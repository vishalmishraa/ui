import useTheme from "../../stores/themeStore";

export default function ProfileSkeleton() {
    const theme = useTheme((state) => state.theme);
    const isDark = theme === "dark";
    
    return (
        <div className="w-full h-full">
            <div className={`w-full max-w-full p-6 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
                <div className={`h-8 w-40 rounded-md mb-6 animate-pulse ${
                    isDark ? 'bg-gray-700' : 'bg-gray-300'
                }`}></div>
                
                <div className={`max-w-md w-full ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'} p-6 rounded-lg shadow-md mb-6`}>
                    <div className="mb-6">
                        <div className={`h-5 w-24 rounded-md mb-2 animate-pulse ${
                            isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className={`h-10 w-full rounded-xl animate-pulse ${
                            isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}></div>
                    </div>
                </div>
                
                <div className={`max-w-md w-full ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'} p-6 rounded-lg shadow-md`}>
                    <div className={`h-6 w-48 rounded-md mb-4 animate-pulse ${
                        isDark ? 'bg-gray-700' : 'bg-gray-300'
                    }`}></div>
                    
                    <div className="mb-4">
                        <div className={`h-5 w-36 rounded-md mb-2 animate-pulse ${
                            isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className={`h-14 w-full rounded-xl animate-pulse ${
                            isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}></div>
                    </div>
                    
                    <div className="mb-6">
                        <div className={`h-5 w-32 rounded-md mb-2 animate-pulse ${
                            isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className={`h-14 w-full rounded-xl animate-pulse ${
                            isDark ? 'bg-gray-700' : 'bg-gray-300'
                        }`}></div>
                    </div>
                    
                    <div className={`h-14 w-full rounded-xl animate-pulse ${
                        isDark ? 'bg-blue-700/40' : 'bg-blue-300'
                    }`}></div>
                </div>
            </div>
        </div>
    );
} 