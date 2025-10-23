import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { styles, colors } from './styles'

interface PDFFooterProps {
  pageNumber?: number
  totalPages?: number
}

export const PDFFooter: React.FC<PDFFooterProps> = ({ pageNumber, totalPages }) => {
  return (
    <View style={styles.footer} fixed>
      <Text style={{ 
        fontSize: 8, 
        color: colors.gray[500],
        textAlign: 'center'
      }}>
        Page {pageNumber || 1}{totalPages ? ` sur ${totalPages}` : ''}
      </Text>
    </View>
  )
}





