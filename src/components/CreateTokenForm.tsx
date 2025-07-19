import React, { useState, useEffect, useRef } from 'react';

interface CreateTokenFormProps {
    onTokenCreated?: (token: string) => void;
}

const CreateTokenForm: React.FC<CreateTokenFormProps> = ({ onTokenCreated }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [apiUrl, setApiUrl] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const expiresRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        // Get API URL from environment or global ProfilePage
        const url = import.meta.env.PUBLIC_BACKEND_URL || (window as any).profilePage?.apiUrl || '';
        setApiUrl(url);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        try {
            setIsLoading(true);

            // Wait for Clerk to be available
            let attempts = 0;
            const maxAttempts = 50;
            
            while (attempts < maxAttempts) {
                if (typeof window !== 'undefined' && 
                    (window as any).Clerk && 
                    (window as any).Clerk.loaded && 
                    (window as any).Clerk.user && 
                    (window as any).Clerk.session) {
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (attempts >= maxAttempts) {
                throw new Error('Authentication service not available');
            }

            const authToken = await (window as any).Clerk.session.getToken();
            if (!authToken) {
                throw new Error('No authentication token available');
            }

            // Get form values using refs instead of FormData
            const tokenName = nameRef.current?.value?.trim() || '';
            const expiresInDays = expiresRef.current?.value || '';
            
            const tokenData: any = {
                name: tokenName
            };

            // Handle expiration
            if (expiresInDays) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
                tokenData.expiresAt = expiresAt.toISOString();
            }

            const response = await fetch(`${apiUrl}/api/tokens`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tokenData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create API token');
            }

            const data = await response.json();
            
            // Reset form using ref
            if (formRef.current) {
                formRef.current.reset();
            }
            
            // Show the new token modal
            if ((window as any).showNewTokenModal) {
                (window as any).showNewTokenModal(data.data.rawToken);
            }
            
            // Reload the tokens list
            if ((window as any).reloadTokensList) {
                (window as any).reloadTokensList();
            }
            
            // Show success message
            if ((window as any).profilePage?.updateStatus) {
                (window as any).profilePage.updateStatus('API token created successfully!', 'success');
            }

            // Call callback if provided
            if (onTokenCreated) {
                onTokenCreated(data.data.rawToken);
            }

        } catch (error) {
            console.error('Error creating API token:', error);
            
            // Show error message
            if ((window as any).profilePage?.updateStatus) {
                (window as any).profilePage.updateStatus(
                    (error as Error).message || 'Failed to create API token', 
                    'error'
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-100 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600 mr-2">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
                        <path d="M15 9h.01" />
                    </svg>
                    Create API Token
                </h2>

                <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 mb-2">
                            Token Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={nameRef}
                            type="text"
                            id="token-name"
                            name="name"
                            required
                            maxLength={100}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., My Integration, Script Token"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500 mt-1">Choose a descriptive name to identify this token</p>
                    </div>
                    
                    <div>
                        <label htmlFor="token-expires" className="block text-sm font-medium text-gray-700 mb-2">
                            Expiration (optional)
                        </label>
                        <select 
                            ref={expiresRef}
                            id="token-expires" 
                            name="expires" 
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled={isLoading}
                        >
                            <option value="">Never expires</option>
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Tokens without expiration are more convenient but less secure</p>
                    </div>
                    
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating...
                            </span>
                        ) : (
                            'Create API Token'
                        )}
                    </button>
                </form>

                {/* API Documentation Link */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">API Documentation</h3>
                    <p className="text-xs text-gray-600 mb-3">Learn how to use API tokens to access your data programmatically.</p>
                    <div className="space-y-2">
                        <div className="text-xs">
                            <span className="font-medium">Base URL:</span>
                            <code className="bg-gray-200 px-1 rounded ml-1">{apiUrl || 'loading...'}</code>
                        </div>
                        <div className="text-xs">
                            <span className="font-medium">Authorization:</span>
                            <code className="bg-gray-200 px-1 rounded ml-1">Bearer YOUR_API_TOKEN</code>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateTokenForm;
