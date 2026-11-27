import React from "react";
export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="error-state" role="alert">
        <p>Halaman tidak dapat ditampilkan. Muat ulang untuk mencoba lagi.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
