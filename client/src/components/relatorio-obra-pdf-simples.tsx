import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction, ProjectFile } from '@shared/schema';

interface RelatorioObraPDFSimplesProps {
  project: {
    id: string;
    name: string;
    value: string | number;
    status: string;
    client?: string;
    address?: string;
    startDate?: string;
    endDate?: string;
    responsible?: string;
  };
  transactions: Transaction[];
  projectFiles: ProjectFile[];
  reportType: 'detailed' | 'summary';
  reportPeriod: {
    start: string;
    end: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    lineHeight: 1.3,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center