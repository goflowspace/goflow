import React from 'react';

import styles from './ImagePlaceholder.module.scss';

interface ImagePlaceholderProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Централизованный компонент для отображения placeholder изображений
 */
export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({size = 'medium', className = '', style = {}, alt = 'Изображение отсутствует'}) => {
  return (
    <div className={`${styles.imagePlaceholder} ${styles[size]} ${className}`} style={style} title={alt} role='img' aria-label={alt}>
      📷
    </div>
  );
};

export default ImagePlaceholder;
