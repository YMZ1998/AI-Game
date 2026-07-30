import React from 'react';
import { useAnalytics } from './hooks';
import Home from './scenes/Home';
import Match from './scenes/Match';

export default function App(): React.ReactElement {
    const analytics = useAnalytics();
    const roomId = new URLSearchParams(window.location.search).get('roomId');

    /**
     * Initialize analytics.
     */
    React.useEffect(() => {
        analytics.init();
    }, [analytics]);

    /**
     * Listen to page changes.
     */
    React.useEffect(() => {
        analytics.page(roomId ? `/room/${roomId}` : '/');
    }, [analytics, roomId]);

    return roomId ? <Match roomId={roomId} /> : <Home />;
}
