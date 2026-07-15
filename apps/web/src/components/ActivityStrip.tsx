type ActivityStripProps = {
  items: string[];
};

export function ActivityStrip({ items }: ActivityStripProps) {
  const content = [...items, ...items];

  return (
    <div className="sc-activity-strip" aria-label="Workspace updates">
      <div className="sc-activity-strip__track">
        {content.map((item, index) => (
          <span className="sc-activity-strip__item" key={`${item}-${index}`}>
            <span className="sc-activity-strip__signal" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
