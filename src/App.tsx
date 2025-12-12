import { Layout } from './components/layout/Layout'

function App() {
  return (
    <Layout>
      <div className="text-center py-12">
        <h2 className="text-2xl font-medium mb-4">
          Language Learning Reading Aid
        </h2>
        <p className="text-gray-600">
          Upload a text file to get started
        </p>
      </div>
    </Layout>
  )
}

export default App
