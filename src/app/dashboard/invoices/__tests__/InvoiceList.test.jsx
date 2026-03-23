import { render, screen } from '../../../../test-utils';
import InvoiceList from '../InvoiceList';
import { buildInvoiceDownloadUrl, formatInvoiceNumber } from '@/lib/helpers/invoice-format';

const mockInvoices = [
  {
    id: 1,
    createdAt: '2025-12-01T10:00:00.000Z',
    amount: 1500,
    invoiceUrl: 'https://example.com/invoice1.pdf',
    invoiceNumber: 'MW-2025-1201-001',
  },
  {
    id: 2,
    createdAt: '2025-12-05T10:00:00.000Z',
    amount: 500,
    invoiceUrl: null,
    invoiceNumber: 'MW-2025-1205-001',
  },
];

describe('InvoiceList', () => {
  it('renders list of invoices', () => {
    render(<InvoiceList invoices={mockInvoices} />);
    expect(
      screen.getByText(`Invoice #${formatInvoiceNumber(mockInvoices[0])}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Invoice #${formatInvoiceNumber(mockInvoices[1])}`)
    ).toBeInTheDocument();
  });

  it('renders empty state when no invoices', () => {
    render(<InvoiceList invoices={[]} />);
    expect(screen.getByText(/no invoices found/i)).toBeInTheDocument();
  });

  it('renders download link when invoiceUrl is present', () => {
    render(<InvoiceList invoices={[mockInvoices[0]]} />);
    const downloadLink = screen.getByRole('link', { name: /download/i });
    expect(downloadLink).toBeInTheDocument();
    expect(downloadLink).toHaveAttribute(
      'href',
      buildInvoiceDownloadUrl(
        mockInvoices[0].invoiceUrl,
        formatInvoiceNumber(mockInvoices[0]),
      ),
    );
  });

  it('renders generating message when invoiceUrl is missing', () => {
    render(<InvoiceList invoices={[mockInvoices[1]]} />);
    expect(screen.getByText(/generating invoice.../i)).toBeInTheDocument();
  });
});
