export function useTwitterAccount(): [ string | undefined ] {
    const twitterAccount = localStorage.getItem('social') ? JSON.parse(localStorage.getItem('social') || "{}").twitterAccount : '';
    return [twitterAccount];
}