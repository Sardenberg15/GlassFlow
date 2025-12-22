import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction, ProjectFile } from '@shared/schema';

interface RelatorioObraPDFSimpleProps {
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
    padding: 40