"use client";
import React, { useState } from 'react';
import { Plus } from '../components/svgs';
import styles from './HelpPage.module.css';

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.faqItem}>
      <div
        className={styles.faqQuestionRow}
        onClick={() => setOpen(!open)}
      >
        <span
          className={styles.faqPlusIcon}
          style={{
            transform: open ? 'rotate(45deg)' : 'none'
          }}
        >
          <Plus />
        </span>
        <span className={styles.faqQuestion}>{question}</span>
      </div>
      <div className={`${styles.faqAnswer} ${open ? styles.open : ''}`}>
        {answer}
      </div>
    </div>
  );
};

export default FAQItem;