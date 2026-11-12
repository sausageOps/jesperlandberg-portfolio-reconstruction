import A24Nav from './A24Nav.jsx';

// Keep the retained A24 navigation and its route motion unchanged.
export default function Hud({ navRouteKey, activeKey, activePath, loading, onHome, onNavigate }) {
  return <A24Nav onHome={onHome} onNavigate={onNavigate} loading={loading}
    routeKey={navRouteKey} activeKey={activeKey} activePath={activePath} hidden={false} />;
}
