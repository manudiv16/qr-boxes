import React, { useState, useEffect } from 'react';

interface Token {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsedAt?: string;
    expiresAt?: string;
    isActive: boolean;
}

interface TokensListProps {
    onReload?: () => void;
}

const TokensList: React.FC<TokensListProps> = ({ onReload }) => {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper function to wait for Clerk initialization
    const waitForClerk = async (): Promise<boolean> => {
        let attempts = 0;
        const maxAttempts = 50; // Wait up to 5 seconds
        
        while (attempts < maxAttempts) {
            if (typeof window !== 'undefined' && 
                (window as any).Clerk && 
                (window as any).Clerk.loaded && 
                (window as any).Clerk.user && 
                (window as any).Clerk.session) {
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        return false;
    };

    const loadTokens = async () => {
        try {
            setLoading(true);
            setError(null);

            // Wait for Clerk to be fully initialized
            const clerkReady = await waitForClerk();
            if (!clerkReady) {
                throw new Error('Authentication service not available. Please refresh the page.');
            }

            const authToken = await (window as any).Clerk.session.getToken();
            if (!authToken) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.PUBLIC_BACKEND_URL;
            const response = await fetch(`${apiUrl}/api/tokens`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tokens: ${response.status}`);
            }

            const data = await response.json();
            setTokens(data.data?.tokens || []);
        } catch (err) {
            console.error('Error loading tokens:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load tokens';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Add a small delay to ensure Clerk is initialized after hydration
        const initializeTokens = async () => {
            // Wait a bit for hydration to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Try loading tokens, and if it fails due to auth, try once more
            try {
                await loadTokens();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '';
                if (errorMessage.includes('Authentication') || errorMessage.includes('sign in')) {
                    // Wait a bit longer and try once more
                    setTimeout(async () => {
                        try {
                            await loadTokens();
                        } catch (retryError) {
                            console.error('Retry failed:', retryError);
                        }
                    }, 1500);
                }
            }
        };
        
        initializeTokens();
    }, []);

    // Expose reload function to parent
    useEffect(() => {
        if (onReload) {
            (window as any).reloadTokensList = loadTokens;
        }
        return () => {
            if ((window as any).reloadTokensList) {
                delete (window as any).reloadTokensList;
            }
        };
    }, [onReload]);

    const handleToggleToken = async (tokenId: string, isActive: boolean) => {
        try {
            // Wait for Clerk to be available
            const clerkReady = await waitForClerk();
            if (!clerkReady) {
                throw new Error('Authentication service not available');
            }

            const authToken = await (window as any).Clerk.session.getToken();
            if (!authToken) {
                throw new Error('No authentication token available');
            }

            const apiUrl = import.meta.env.PUBLIC_BACKEND_URL;
            const response = await fetch(`${apiUrl}/api/tokens/update?tokenId=${tokenId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive })
            });

            if (!response.ok) {
                throw new Error('Failed to update token');
            }

            // Reload tokens after successful update
            await loadTokens();

            // Show success message (assuming there's a global function)
            if ((window as any).profilePage?.updateStatus) {
                (window as any).profilePage.updateStatus(
                    `Token ${isActive ? 'activated' : 'deactivated'} successfully!`, 
                    'success'
                );
            }
        } catch (err) {
            console.error('Error toggling token:', err);
            if ((window as any).profilePage?.updateStatus) {
                (window as any).profilePage.updateStatus(
                    'Failed to update token', 
                    'error'
                );
            }
        }
    };

    const handleDeleteToken = (tokenId: string, tokenName: string) => {
        // Use the global function from DeleteTokenModal component
        if ((window as any).showDeleteTokenModal) {
            (window as any).showDeleteTokenModal(tokenId, tokenName);
        }
    };

    if (loading) {
        return (
            <div className="lg:col-span-2">
                <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-100 mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600 mr-2">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
                            <path d="M15 9h.01" />
                        </svg>
                        Your API Tokens
                    </h3>
                </div>
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading tokens...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="lg:col-span-2">
                <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-100 mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600 mr-2">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
                            <path d="M15 9h.01" />
                        </svg>
                        Your API Tokens
                    </h3>
                </div>
                <div className="text-center py-16">
                    <div className="text-red-600 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">Error loading tokens</h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={loadTokens}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-lg p-4 border border-gray-100 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-600 mr-2">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z" />
                        <path d="M15 9h.01" />
                    </svg>
                    Your API Tokens
                </h3>
            </div>
            
            <div className="space-y-4">
                {tokens.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414a6 6 0 017.743-5.743L15 7z"></path>
                        </svg>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">No API tokens yet</h3>
                        <p className="text-gray-600 mb-6">Create your first API token to start accessing the API programmatically</p>
                    </div>
                ) : (
                    tokens.map((token) => {
                        const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
                        const isActive = token.isActive && !isExpired;
                        
                        return (
                            <div key={token.id} className={`bg-white border ${isActive ? 'border-gray-200' : 'border-red-200'} rounded-lg p-6 hover:shadow-lg transition-all`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <h4 className="text-lg font-semibold text-gray-900">{token.name}</h4>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                isActive 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {isActive ? '🟢 Active' : isExpired ? '🔴 Expired' : '⏸️ Inactive'}
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">Prefix:</span> 
                                                <code className="bg-gray-100 px-1 rounded ml-1">{token.prefix}***</code>
                                            </div>
                                            <div>
                                                <span className="font-medium">Created:</span> {new Date(token.createdAt).toLocaleDateString()}
                                            </div>
                                            <div>
                                                <span className="font-medium">Last used:</span> {
                                                    token.lastUsedAt 
                                                        ? new Date(token.lastUsedAt).toLocaleDateString()
                                                        : 'Never'
                                                }
                                            </div>
                                            <div>
                                                <span className="font-medium">Expires:</span> {
                                                    token.expiresAt 
                                                        ? new Date(token.expiresAt).toLocaleDateString()
                                                        : 'Never'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-gray-100">
                                    <button 
                                        className={`text-sm px-3 py-1 rounded-md transition-colors border ${
                                            token.isActive 
                                                ? 'text-orange-600 hover:text-orange-800 border-orange-300 hover:bg-orange-50' 
                                                : 'text-green-600 hover:text-green-800 border-green-300 hover:bg-green-50'
                                        }`}
                                        onClick={() => handleToggleToken(token.id, !token.isActive)}
                                    >
                                        {token.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                                    </button>
                                    <button 
                                        className="text-white bg-red-600 hover:bg-red-700 font-medium text-sm px-3 py-1 rounded-md transition-colors border border-red-600"
                                        onClick={() => handleDeleteToken(token.id, token.name)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TokensList;
