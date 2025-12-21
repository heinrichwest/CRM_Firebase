import { useParams, useSearchParams } from 'react-router-dom'
import ClientFinancialEditor from './ClientFinancialEditor'

const EditFinancial = () => {
  const { clientId } = useParams()
  const [searchParams] = useSearchParams()
  const productLine = searchParams.get('productLine')

  // Use the same ClientFinancialEditor for everyone
  // The editor already handles filtering by role internally
  return <ClientFinancialEditor preselectedClientId={clientId} preselectedProductLine={productLine} />
}

export default EditFinancial
