import Image from "next/image";
import styles from "./profile-icon.module.css";

export function ProfileIcon() {
  return (
    <Image
      src="/assets/images/about-favicon-elias-20260523-32.png"
      alt=""
      width={32}
      height={32}
      className={styles.icon}
    />
  );
}
