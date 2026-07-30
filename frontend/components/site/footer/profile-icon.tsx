import Image from "next/image";
import { assetManifest } from "@/domain/site/assets";
import styles from "./profile-icon.module.css";

export function ProfileIcon() {
  const portrait = assetManifest.files.profilePortrait;

  return (
    <Image
      src={portrait.path}
      alt=""
      width={portrait.width}
      height={portrait.height}
      className={styles.icon}
    />
  );
}
