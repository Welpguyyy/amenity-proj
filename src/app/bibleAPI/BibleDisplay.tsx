"use client";
import { useEffect, useState } from "react";
import styles from "./BibleDisplay.module.css";

type Verse = {
  chapter: number;
  verse: number;
  text: string;
};

type Props = {
  selectedBook?: string;
  selectedChapter?: number;
}

const chapterCounts: Record<string, number> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
};

export default function BibleDisplay({ selectedBook = "Genesis", selectedChapter }: Props) {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reference, setReference] = useState("Genesis");

  const fetchBookOrChapter = async (book: string, chapter?: number) => {
    const chapterCount = chapterCounts[book];
    if (!chapterCount) return;
    setLoading(true);
    try {
      if (chapter) {
        // Fetch only the selected chapter
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}`);
        if (!res.ok) throw new Error(`Failed to load ${book} ${chapter}`);
        const data = await res.json();
        setVerses(data.verses || []);
        setReference(`${book} ${chapter}`);
      } else {
        // Fetch all chapters
        const chapterPromises = [];
        for (let i = 1; i <= chapterCount; i++) {
          chapterPromises.push(
            fetch(`https://bible-api.com/${encodeURIComponent(book)}+${i}`).then((res) => {
              if (!res.ok) throw new Error(`Failed to load ${book} ${i}`);
              return res.json();
            })
          );
        }
        const results = await Promise.allSettled(chapterPromises);
        const successful = results
          .filter((r): r is PromiseFulfilledResult<unknown> => r.status === "fulfilled")
          .map((r) => r.value);
        const allVerses = successful.flatMap((chapter: any) => chapter.verses || []);
        setVerses(allVerses);
        setReference(book);
      }
    } catch (error) {
      console.error(`Error loading ${book}:`, error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBookOrChapter(selectedBook, selectedChapter);
  }, [selectedBook, selectedChapter]);

  if (loading) return <p className="paragraph">Loading Bible...</p>;
  if (!verses.length) return <p className="paragraph">No data available.</p>;

  // Group verses by chapter
  const versesByChapter = verses.reduce((acc: Record<number, Verse[]>, verse) => {
    if (!acc[verse.chapter]) acc[verse.chapter] = [];
    acc[verse.chapter].push(verse);
    return acc;
  }, {});

  return (
    <div className={`${styles.verseScroll}`}>
      <h2 className="headingLarge">{reference}</h2>
      {selectedChapter ? (
        <div className={styles.chapterBlock}>
          <h4 className={styles.chapterHeading}>Chapter {selectedChapter}</h4>
          <p className="paragraph">
            {verses.map((verse) => (
              <span key={`${verse.chapter}-${verse.verse}`}>
                <sup className={styles.superscript}>{verse.verse}</sup>{" "}
                {verse.text.replace(/\n/g, " ").trim()}{" "}
              </span>
            ))}
          </p>
        </div>
      ) : (
        Object.entries(versesByChapter).map(([chapterNumber, chapterVerses]) => (
          <div key={chapterNumber} className={styles.chapterBlock}>
            <h4 className={styles.chapterHeading}>Chapter {chapterNumber}</h4>
            <p className="paragraph">
              {chapterVerses.map((verse) => (
                <span key={`${verse.chapter}-${verse.verse}`}>
                  <sup className={styles.superscript}>{verse.verse}</sup>{" "}
                  {verse.text.replace(/\n/g, " ").trim()}{" "}
                </span>
              ))}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
