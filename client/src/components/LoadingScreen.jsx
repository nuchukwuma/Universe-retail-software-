// A full-page "please wait" message, in plain text.
function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="loading-screen" role="status">
      <p>{message}</p>
    </div>
  );
}

export default LoadingScreen;
